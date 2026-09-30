import cloudinary from "../config/cloudinary.js";
import productModel from "../models/productModel.js";
import getDataUri from "../utils/dataUri.js";

const parseBoolean = (value) => value === true || value === "true";

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, attributes } = req.body;
    const userId = req.userId;

    let productImages = [];
    let parsedAttributes = {};
    if (attributes) {
      try {
        parsedAttributes =
          typeof attributes === "string" ? JSON.parse(attributes) : attributes;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid JSON format for attributes" });
      }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = getDataUri(file);
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: "products",
          resource_type: "image",
        });
        productImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }
    const product = new productModel({
      userId,
      name: String(name || "").trim(),
      description: String(description || "").trim(),
      price: Number(price),
      category: String(category || "").trim(),
      stock: Math.trunc(Number(stock) || 0),
      images: productImages,
      attributes: parsedAttributes,
      isBestSeller: parseBoolean(req.body.isBestSeller),
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category,
      stock,
      attributes,
      existingImages,
      isBestSeller,
    } = req.body;

    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    let productImages = [];

    let updateImages = [];

    if (existingImages !== undefined) {
      let keepId;
      try {
        keepId = Array.isArray(existingImages)
          ? existingImages
          : JSON.parse(existingImages);
      } catch (error) {
        return res
          .status(400)
          .json({ message: "Invalid JSON format for existing images" });
      }
      if (!Array.isArray(keepId)) {
        return res
          .status(400)
          .json({ message: "Existing images must be an array" });
      }
      updateImages = product.images.filter((image) =>
        keepId.includes(image.public_id),
      );
      const removeImages = product.images.filter(
        (image) => !keepId.includes(image.public_id),
      );

      for (const image of removeImages) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    } else {
      updateImages = product.images;
    }
    let parsedAttributes = {};
    if (attributes) {
      try {
        parsedAttributes =
          typeof attributes === "string" ? JSON.parse(attributes) : attributes;
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid JSON format for attributes" });
      }
    }

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const imageUrl = getDataUri(file);
        const result = await cloudinary.uploader.upload(imageUrl, {
          folder: "products",
        });
        productImages.push({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    }

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (isBestSeller !== undefined) {
      product.isBestSeller = parseBoolean(isBestSeller);
    }
    product.images = [...updateImages, ...productImages];
    if (attributes !== undefined) product.attributes = parsedAttributes;

    await product.save();

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        await cloudinary.uploader.destroy(image.public_id);
      }
    }
    await productModel.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const filter = {};
    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 80)
        : "";
    const category =
      typeof req.query.category === "string"
        ? req.query.category.trim().slice(0, 80)
        : "";
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (escapedSearch) {
      const searchPattern = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchPattern },
        { description: searchPattern },
        { category: searchPattern },
      ];
    }

    if (category) {
      const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.category = new RegExp(`^${escapedCategory}$`, "i");
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      "price-low": { price: 1 },
      "price-high": { price: -1 },
      featured: { isBestSeller: -1, createdAt: -1 },
    };
    const sortKey =
      typeof req.query.sort === "string" ? req.query.sort : "featured";
    const sort = sortOptions[sortKey] || sortOptions.featured;
    const query = productModel.find(filter).select("-userId").sort(sort);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    if (Number.isInteger(requestedLimit) && requestedLimit > 0) {
      query.limit(Math.min(requestedLimit, 100));
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      if (page > 1) query.skip((page - 1) * Math.min(requestedLimit, 100));
    }
    const products = await query;
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await productModel
      .findById(req.params.id)
      .select("-userId");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Product not found" });
    }
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getBestSellers = async (req, res) => {
  try {
    const products = await productModel
      .find({ isBestSeller: true, stock: { $gt: 0 } })
      .sort({ createdAt: -1 })
      .limit(8);
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * A lightweight list of browsable categories.
 *
 * The collection page derives categories from the full product list, which is
 * far too heavy to run on every page just to populate the announcement strip.
 * This returns one row per in-stock category with a count and one representative
 * product, so the client can build a banner per category from a single small
 * request. Public and cacheable: no product is exposed beyond name, price and
 * image.
 */
export const getCategories = async (req, res) => {
  try {
    const rows = await productModel.aggregate([
      { $match: { stock: { $gt: 0 }, category: { $nin: [null, ""] } } },
      { $sort: { isBestSeller: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          featured: { $first: { name: "$name", image: { $arrayElemAt: ["$images.url", 0] } } },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 24 },
    ]);

    res.status(200).json({
      categories: rows.map((row) => ({
        name: row._id,
        count: row.count,
        featured: row.featured,
      })),
    });
  } catch (error) {
    console.error("Load categories failed:", error);
    res.status(500).json({ message: "Could not load categories." });
  }
};

