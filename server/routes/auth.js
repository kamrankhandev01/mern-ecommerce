import express from "express";
import {
  loginLimiter,
  registerLimiter,
  resetPasswordLimiter,
  otpLimiter,
  verifyOtpLimiter,
} from "../middlewares/rateLimit.js";
import {
  getAllUsers,
  getUserById,
  getUsers,
  loginUser,
  logoutUser,
  registerUser,
  resetOtp,
  resetPassword,
  sendOtp,
  updateUser,
  updateUserRole,
  verifyEmail,
} from "../controllers/user.js";
import isAuthenticated, { isAdmin } from "../middlewares/userAuth.js";
import { singleUpload } from "../middlewares/multer.js";

const authRouter = express.Router();

authRouter.post("/register", registerLimiter, registerUser);
authRouter.post("/login", loginLimiter, loginUser);
authRouter.post("/logout", logoutUser);
authRouter.post("/otp", otpLimiter, isAuthenticated, sendOtp);
authRouter.post("/verify-email", verifyOtpLimiter, isAuthenticated, verifyEmail);
authRouter.post("/reset-otp", resetPasswordLimiter, resetOtp);
authRouter.post("/reset-password", resetPasswordLimiter, resetPassword);
authRouter.put("/update-user/:id", isAuthenticated, singleUpload, updateUser);

// Customer directory used by the admin console.
authRouter.get("/users", isAuthenticated, isAdmin, getUsers);
authRouter.patch("/users/:id/role", isAuthenticated, isAdmin, updateUserRole);
authRouter.get("/all-users", isAuthenticated, isAdmin, getAllUsers);

// Profiles are private; ownership is enforced inside the controller.
authRouter.get("/user/:id", isAuthenticated, getUserById);

export default authRouter;
