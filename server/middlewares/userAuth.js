import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

/**
 * Verifies the httpOnly session cookie.
 *
 * Every failure mode (missing, malformed, expired or forged token, deleted
 * user) resolves to a clean 401 — never an unhandled 500.
 */
const isAuthenticated = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return unauthorized(res, "Not authenticated");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return unauthorized(res, "Your session is invalid. Please sign in again.");
  }

  try {
    const user = await userModel.findById(decoded.id);
    if (!user) return unauthorized(res, "User not found");

    req.userId = String(user._id);
    req.user = user;
    return next();
  } catch (error) {
    return unauthorized(res, error.message || "Not authenticated");
  }
};

export default isAuthenticated;

/**
 * Attaches the user when a valid session cookie is present but never blocks.
 * Used by public routes that can behave slightly better for signed-in visitors.
 */
export const optionalAuth = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);
    if (user) {
      req.userId = String(user._id);
      req.user = user;
    }
  } catch {
    // An invalid cookie is simply treated as "signed out".
  }
  return next();
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role === "admin") return next();
  return res.status(403).json({
    success: false,
    message: "Access denied. Admins only.",
  });
};

