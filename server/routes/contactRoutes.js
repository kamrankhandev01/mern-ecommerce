import express from "express";
import isAuthenticated, { isAdmin, optionalAuth } from "../middlewares/userAuth.js";
import { contactLimiter } from "../middlewares/rateLimit.js";
import {
  deleteContactMessage,
  getContactMessages,
  submitContactMessage,
  updateContactMessage,
} from "../controllers/contactControllers.js";

const contactRouter = express.Router();

// Visitors do not need an account, so this route is intentionally public —
// the rate limiter is what protects it. A session, if present, is still used to
// link the message to the customer.
contactRouter.post("/", contactLimiter, optionalAuth, submitContactMessage);

contactRouter.get("/", isAuthenticated, isAdmin, getContactMessages);
contactRouter.patch("/:id", isAuthenticated, isAdmin, updateContactMessage);
contactRouter.delete("/:id", isAuthenticated, isAdmin, deleteContactMessage);

export default contactRouter;
