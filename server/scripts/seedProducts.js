import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import productModel from "../models/productModel.js";
import { buildCatalogue } from "./seedCatalogue.js";
import {
  categoryPalette,
  makeSvgDataUri,
  publicIdFor,
} from "./seedImages.js";

// Same DNS pinning the server uses for Atlas SRV lookups.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const pruneDuplicates = args.has("--prune-duplicates");
const removeSeeded = args.has("--remove-seeded");

const summarise = (label, count) =>
  console.log(`  ${label}: ${count}`);

/**
 * Fill in the products the catalogue does not cover.
 *
 * The script is idempotent: a product is identified by `name`, so running it
 * twice never creates duplicates. Use --dry-run to preview, and
 * --prune-duplicates to remove exact-name duplicates left behind by earlier
 * data entry.
 */
const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Every product needs a real user reference, so fall back to an admin.
  const owner = await mongoose.connection.db
    .collection("users")
    .findOne({ role: "admin" });
  if (!owner) {
    throw new Error(
      "No admin account exists to own these products. Create one first (npm run admin:promote).",
    );
  }

  const palette = categoryPalette();
  const catalogue = buildCatalogue();

  /*
   * `--remove-seeded` deletes only the rows this script created.
   *
   * Two conditions must both hold, so a hand-made product that happens to
   * share a name with a seeded one is never touched:
   *   1. the name is in this file's catalogue, and
   *   2. the image is the generated SVG data URI written by this script.
   */
  if (removeSeeded) {
    const names = catalogue.map((entry) => entry.name);
    const targets = await productModel.find({
      name: { $in: names },
      "images.0.url": /^data:image\/svg\+xml/,
    });

    if (targets.length === 0) {
      console.log("No seeded products found — nothing to remove.");
      await mongoose.disconnect();
      return;
    }

    console.log(`\nSeeded products found: ${targets.length}`);
    targets.forEach((product) =>
      console.log(`  - ${product.name} (${product.category})`),
    );

    // Refuse to delete anything an order still points at.
    const ids = targets.map((product) => product._id);
    const [orders, carts, wishlists] = await Promise.all([
      mongoose.connection.db
        .collection("orders")
        .countDocuments({ "items.productId": { $in: ids } }),
      mongoose.connection.db
        .collection("carts")
        .countDocuments({ "items.productId": { $in: ids } }),
      mongoose.connection.db
        .collection("wishlists")
        .countDocuments({ "items.productId": { $in: ids } }),
    ]);
    const referenced = orders + carts + wishlists;
    if (referenced > 0) {
      throw new Error(
        `Refusing to remove: ${referenced} cart/wishlist/order reference(s) point at these products.`,
      );
    }

    if (dryRun) {
      console.log("\nDry run — nothing deleted.");
    } else {
      const result = await productModel.deleteMany({ _id: { $in: ids } });
      console.log(`\nRemoved ${result.deletedCount} seeded product(s).`);
    }

    const total = await productModel.countDocuments();
    console.log(`Catalogue now holds ${total} products.`);
    await mongoose.disconnect();
    return;
  }

  /*
   * Repair legacy rows where `userId` was stored as the literal placeholder, or
   * as a plain `{ $oid: "..." }` object rather than a real ObjectId. Those cannot
   * be matched with a normal query, because casting hides them — so they are
   * found by inspecting the raw BSON type.
   */
  const rawProducts = await mongoose.connection.db
    .collection("products")
    .find({})
    .toArray();
  const broken = rawProducts.filter(
    (product) => !(product.userId instanceof mongoose.Types.ObjectId),
  );
  if (broken.length > 0) {
    if (dryRun) {
      console.log(
        `\nWould repair ${broken.length} product(s) with an invalid owner reference.`,
      );
    } else {
      for (const product of broken) {
        await productModel.updateOne(
          { _id: product._id },
          { $set: { userId: owner._id } },
        );
      }
      console.log(
        `\nRepaired ${broken.length} product(s) with an invalid owner reference.`,
      );
    }
  }

  if (pruneDuplicates) {
    const all = await productModel.find({}).lean();
    const groups = new Map();
    for (const product of all) {
      const key = product.name.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(product);
    }

    const doomed = [];
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      /*
       * Keep the richest record, not whichever the database happened to return
       * first. Ties fall back to the older document, so the run is stable.
       */
      const [keeper, ...rest] = [...group].sort((a, b) => {
        const images = (b.images?.length || 0) - (a.images?.length || 0);
        if (images !== 0) return images;
        const stock = (b.stock || 0) - (a.stock || 0);
        if (stock !== 0) return stock;
        return String(a._id).localeCompare(String(b._id));
      });
      console.log(
        `\nKeeping "${keeper.name}" (${keeper.images?.length || 0} image(s), stock ${keeper.stock}).`,
      );
      doomed.push(...rest.map((product) => product._id));
    }

    if (doomed.length > 0) {
      if (dryRun) {
        console.log(`\nWould remove ${doomed.length} duplicate product(s).`);
      } else {
        const result = await productModel.deleteMany({ _id: { $in: doomed } });
        console.log(`\nRemoved ${result.deletedCount} duplicate product(s).`);
      }
    } else {
      console.log("\nNo duplicate products found.");
    }
  }

  const created = [];
  const skipped = [];

  for (const entry of catalogue) {
    const existing = await productModel.findOne({ name: entry.name });
    if (existing) {
      skipped.push(entry.name);
      continue;
    }

    const image = makeSvgDataUri(entry, palette);

    if (dryRun) {
      created.push(entry.name);
      continue;
    }

    await productModel.create({
      userId: owner._id,
      name: entry.name,
      description: entry.description,
      price: entry.price,
      category: entry.category,
      stock: entry.stock,
      isBestSeller: Boolean(entry.isBestSeller),
      images: [
        {
          // A self-contained data URI: no external host to 404, and it works
          // offline. Replace with a Cloudinary upload in production.
          url: image,
          public_id: publicIdFor(entry.category, entry.name),
        },
      ],
      attributes: entry.attributes,
    });
    created.push(entry.name);
  }

  const byCategory = catalogue.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + 1;
    return acc;
  }, {});

  console.log(
    dryRun
      ? `\nDRY RUN — would create ${created.length} product(s):`
      : `\nCreated ${created.length} product(s):`,
  );
  for (const [category, count] of Object.entries(byCategory).sort()) {
    summarise(category, count);
  }
  if (skipped.length > 0) {
    console.log(`\nAlready present, left untouched (${skipped.length}):`);
    skipped.forEach((name) => console.log(`  - ${name}`));
  }

  const total = await productModel.countDocuments();
  console.log(`\nCatalogue now holds ${total} products.`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(`\nSeed failed: ${error.message || error}`);
  try {
    await mongoose.disconnect();
  } catch {
    // Nothing to clean up.
  }
  process.exitCode = 1;
});
