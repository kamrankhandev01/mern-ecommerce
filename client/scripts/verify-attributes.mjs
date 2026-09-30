import {
  attributesToForm,
  fieldsForCategory,
  formToAttributes,
  hasCustomSchema,
  schemaKeysFor,
  CATEGORY_SCHEMAS,
} from "../src/lib/categoryAttributes.js";

let failures = 0;
const check = (label, condition, extra) => {
  if (condition) console.log(`  PASS  ${label}`);
  else {
    failures += 1;
    console.log(`  FAIL  ${label}`, extra ?? "");
  }
};

console.log("\n== schema coverage ==");
for (const category of Object.keys(CATEGORY_SCHEMAS)) {
  const fields = fieldsForCategory(category);
  check(
    `${category} resolves to its own fields`,
    hasCustomSchema(category) && fields.length > 0,
    fields.length,
  );
}
check("unknown category falls back to generic", fieldsForCategory("Books").length > 0);
check("empty category falls back to generic", fieldsForCategory("").length > 0);
check("category match is case-insensitive", hasCustomSchema("electronics"));
check("category match trims whitespace", hasCustomSchema("  Outdoors "));

console.log("\n== field uniqueness ==");
for (const [category, schema] of Object.entries(CATEGORY_SCHEMAS)) {
  const keys = schema.fields.map((f) => f.key.toLowerCase());
  check(`${category} has no duplicate field keys`, new Set(keys).size === keys.length, keys);
}

console.log("\n== round trip: stored attributes survive a reopen ==");
const samples = [
  ["Electronics", { SwitchType: "Brown Tactile", Backlight: "RGB", Connectivity: "Wired / Type-C" }],
  ["Electronics", { Battery: "12 hours", Weight: "540g" }],
  ["Home & Kitchen", { Material: "Stoneware", "Oven safe": "Yes", Pieces: "4" }],
  ["Outdoors", { "Boil time": "3.5 min", "Packs into itself": "Folds into its own pocket" }],
  ["Stationery", { Pages: "192", Grid: "Dot", Paper: "100gsm" }],
  ["Lighting", { "Cord length": "2m", Fitting: "E27", Battery: "12 hours" }],
  ["Fitness", { Thickness: "4.5mm", Material: "Cork / natural rubber" }],
  ["Fashion", { Material: "Waxed canvas", Capacity: "35L", Base: "Leather" }],
];

/**
 * Keys may be normalised on save (an older `Battery` becomes `BatteryLife`),
 * which is deliberate. What must never happen is a *value* disappearing, so
 * each stored pair is matched by value rather than by key. Booleans are written
 * back in a readable form ("Oven safe"), so any affirmative value counts.
 */
const countsAsKept = (value, savedValues) => {
  const text = String(value).trim();
  if (/^(true|yes|y|1|on|safe|dishwasher ?safe|oven ?safe)$/i.test(text)) {
    return savedValues.some((saved) =>
      /^(true|yes|y|1|on|safe|dishwasher ?safe|oven ?safe)$/i.test(
        String(saved).trim(),
      ),
    );
  }
  return savedValues.includes(text);
};

for (const [category, stored] of samples) {
  const { values, extras } = attributesToForm(stored, category);
  const savedValues = Object.values(formToAttributes(values, extras, category));
  const lost = Object.values(stored).filter(
    (value) => !countsAsKept(value, savedValues),
  );
  check(
    `${category}: no value lost (${Object.keys(stored).join(", ") || "none"})`,
    lost.length === 0,
    lost,
  );
}

console.log("\n== unknown keys are preserved as extras ==");
const withExtra = attributesToForm(
  { Material: "Aluminium", "Some Legacy Field": "kept" },
  "Fitness",
);
check("known field is mapped", withExtra.values.Material === "Aluminium");
check("unknown field becomes an extra", withExtra.extras["Some Legacy Field"] === "kept");
const rebuilt = formToAttributes(withExtra.values, withExtra.extras, "Fitness");
check("extra survives a save", rebuilt["Some Legacy Field"] === "kept", rebuilt);

console.log("\n== category change keeps data ==");
const fromElectronics = attributesToForm(
  { Material: "Aluminium", Battery: "30 hours" },
  "Electronics",
);
const carried = formToAttributes(
  fromElectronics.values,
  fromElectronics.extras,
  "Electronics",
);
const asStationery = attributesToForm(carried, "Stationery");
const carried2 = formToAttributes(
  asStationery.values,
  asStationery.extras,
  "Stationery",
);
check(
  "Battery carries across a category change",
  carried2.Battery === "30 hours" || carried2.BatteryLife === "30 hours",
  carried2,
);
check("Material carries across", carried2.Material === "Aluminium", carried2);

console.log("\n== empty and malformed input ==");
check("null attributes are safe", attributesToForm(null, "Electronics").values.Connectivity === "");
check("array attributes are safe", attributesToForm([], "Electronics").extras && Object.keys(attributesToForm([], "Electronics").extras).length === 0);
check("formToAttributes tolerates undefined values", typeof formToAttributes(undefined, undefined, "Outdoors") === "object");
check("empty form produces empty attributes", Object.keys(formToAttributes({}, {}, "Fitness")).length === 0);

console.log("\n== booleans ==");
const boolForm = attributesToForm({ "Oven safe": "Yes" }, "Home & Kitchen");
check("boolean reads as checked", boolForm.values.OvenSafe === true, boolForm.values);
check(
  "legacy 'Safe' also reads as checked",
  attributesToForm({ Dishwasher: "Safe" }, "Home & Kitchen").values
    .DishwasherSafe === true,
);
const boolSaved = formToAttributes(
  { ...boolForm.values, DishwasherSafe: false },
  {},
  "Home & Kitchen",
);
check("checked boolean persists readably", boolSaved.OvenSafe === "Oven safe", boolSaved);
check("unchecked boolean is omitted", !("DishwasherSafe" in boolSaved), boolSaved);

console.log("\n== every field is well formed ==");
for (const [category, schema] of Object.entries(CATEGORY_SCHEMAS)) {
  const bad = schema.fields.filter(
    (f) =>
      !f.key ||
      !f.label ||
      !["text", "number", "select", "boolean"].includes(f.type) ||
      (f.type === "select" && (!Array.isArray(f.options) || !f.options.length)),
  );
  check(`${category} fields are valid`, bad.length === 0, bad);
  check(`${category} exposes its keys`, schemaKeysFor(category).length === schema.fields.length);
}

/*
 * Finally, replay every attribute key that actually exists in the live
 * database. Any key that cannot round-trip is data the new form would drop.
 */
let liveDocs = [];
try {
  // mongoose is a server dependency, so import it by resolved path.
  const { default: dotenv } = await import("dotenv");
  dotenv.config({ path: "../../server/.env" });
  const mongoose = (
    await import("../../server/node_modules/mongoose/index.js")
  ).default;
  const dns = await import("node:dns");
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  await mongoose.connect(process.env.MONGO_URI);
  liveDocs = await mongoose.connection.db
    .collection("products")
    .find({}, { projection: { category: 1, attributes: 1, name: 1 } })
    .toArray();
  await mongoose.disconnect();
} catch (error) {
  console.log(`\n(skipping live database check: ${error.message})`);
}

if (liveDocs.length > 0) {
  console.log(`\n== live database replay (${liveDocs.length} products) ==`);
  let atRisk = 0;
  for (const doc of liveDocs) {
    const stored = doc.attributes || {};
    const keys = Object.keys(stored);
    if (keys.length === 0) continue;
    const { values, extras } = attributesToForm(stored, doc.category);
    const savedValues = Object.values(
      formToAttributes(values, extras, doc.category),
    );
    const lost = Object.values(stored).filter(
      (value) => !countsAsKept(value, savedValues),
    );
    if (lost.length > 0) {
      atRisk += 1;
      console.log(
        `  LOST  [${doc.category}] ${doc.name || "(unnamed)"} -> ${JSON.stringify(lost)}`,
      );
    }
  }
  check(`no live product loses a value (${atRisk} at risk)`, atRisk === 0, atRisk);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
