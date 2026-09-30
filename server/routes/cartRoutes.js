import express from "express";
import isAuthenticated from "../middlewares/userAuth.js";
import { cartWriteLimiter } from "../middlewares/rateLimit.js";
import {
  addCartItem,
  clearCart,
  getCart,
  mergeCart,
  removeCartItem,
  updateCartItem,
} from "../controllers/cartControllers.js";

const cartRouter = express.Router();

// A cart is always personal: every route below requires a signed-in user.
cartRouter.use(isAuthenticated);

cartRouter.get("/", getCart);
cartRouter.post("/items", cartWriteLimiter, addCartItem);
cartRouter.patch("/items/:productId", cartWriteLimiter, updateCartItem);
cartRouter.delete("/items/:productId", removeCartItem);
cartRouter.post("/merge", cartWriteLimiter, mergeCart);
cartRouter.delete("/", clearCart);

export default cartRouter;
