import express from "express";
import { multipleUpload } from "../middlewares/multer.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getBestSellers,
  getCategories,
  getProductById,
  updateProduct,
} from "../controllers/productControllers.js";
import isAuthenticated, { isAdmin } from "../middlewares/userAuth.js";
const productRouter = express.Router();

productRouter.post(
  "/add-product",
  isAuthenticated,
  isAdmin,
  multipleUpload,
  createProduct,
);
productRouter.put(
  "/update-product/:id",
  isAuthenticated,
  isAdmin,
  multipleUpload,
  updateProduct,
);
productRouter.delete(
  "/delete-product/:id",
  isAuthenticated,
  isAdmin,
  deleteProduct,
);
productRouter.get("/best-sellers", getBestSellers);
// Declared before `/product/:id` so "categories" is never read as an id.
productRouter.get("/categories", getCategories);
productRouter.get("/product/:id", getProductById);
productRouter.get("/all-products", getAllProducts);

export default productRouter;
