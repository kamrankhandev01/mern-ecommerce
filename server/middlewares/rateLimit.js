import rateLimit from "express-rate-limit";

const jsonMessage = (message) => ({ success: false, message });

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage(
    "Too many login attempts. Please try again in 15 minutes.",
  ),
  skipSuccessfulRequests: true,
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage(
    "Too many accounts created from this IP. Please try again later.",
  ),
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: jsonMessage("Too many attempts. Please try again in 15 minutes."),
});

export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage(
    "Too many OTP requests. Please try again in 15 minutes.",
  ),
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage("Too many attempts. Please try again in 15 minutes."),
});

export const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: jsonMessage("Too many order attempts. Please try again later."),
});

export const cartWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: jsonMessage(
    "Too many cart updates. Please slow down and try again.",
  ),
});

/** The contact form is public, so it is the strictest public limit here. */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage(
    "Too many messages sent. Please try again in a few minutes.",
  ),
});

export const wishlistWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  message: jsonMessage(
    "Too many wishlist updates. Please slow down and try again.",
  ),
});
