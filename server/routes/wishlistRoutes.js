import express from "express";
import isAuthenticated from "../middlewares/userAuth.js";
import { wishlistWriteLimiter } from "../middlewares/rateLimit.js";
import {
  addWishlistItem,
  clearWishlist,
  getWishlist,
  mergeWishlist,
  removeWishlistItem,
} from "../controllers/wishlistControllers.js";

const wishlistRouter = express.Router();

// A wishlist is always personal, exactly like the cart.
wishlistRouter.use(isAuthenticated);

wishlistRouter.get("/", getWishlist);
wishlistRouter.post("/items", wishlistWriteLimiter, addWishlistItem);
wishlistRouter.delete(
  "/items/:productId",
  wishlistWriteLimiter,
  removeWishlistItem,
);
wishlistRouter.post("/merge", wishlistWriteLimiter, mergeWishlist);
wishlistRouter.delete("/", clearWishlist);

export default wishlistRouter;
