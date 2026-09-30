import express from "express";
import isAuthenticated, { isAdmin } from "../middlewares/userAuth.js";
import { createOrderLimiter } from "../middlewares/rateLimit.js";
import {
  confirmOrderPayment,
  createOrder,
  getAdminOrderStats,
  getAdminOrders,
  getMyOrders,
  getOrderById,
  getPaymentOptions,
  handleSafepayWebhook,
  updateAdminOrder,
} from "../controllers/orderControllers.js";
import { getAnalyticsReport } from "../controllers/analyticsControllers.js";

const orderRouter = express.Router();

orderRouter.get("/payment-options", getPaymentOptions);
orderRouter.post("/webhooks/safepay", handleSafepayWebhook);
orderRouter.post("/", createOrderLimiter, isAuthenticated, createOrder);
orderRouter.get("/mine", isAuthenticated, getMyOrders);
orderRouter.get("/admin/stats", isAuthenticated, isAdmin, getAdminOrderStats);
orderRouter.get("/admin/analytics", isAuthenticated, isAdmin, getAnalyticsReport);
orderRouter.get("/admin", isAuthenticated, isAdmin, getAdminOrders);
orderRouter.patch("/admin/:id", isAuthenticated, isAdmin, updateAdminOrder);
orderRouter.post("/:id/confirm", isAuthenticated, confirmOrderPayment);
orderRouter.get("/:id", isAuthenticated, getOrderById);

export default orderRouter;

