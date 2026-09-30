import env from "../config/env.js";

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `No API route matches ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Converts anything thrown anywhere in the stack into a predictable JSON
 * response. In production the client never sees internals or stack traces.
 */
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  let status = error.status || error.statusCode || 500;
  let message = error.message || "Something went wrong.";

  if (error.name === "CastError") {
    status = 400;
    message = "That identifier is not valid.";
  } else if (error.name === "ValidationError") {
    status = 400;
    const first = Object.values(error.errors || {})[0];
    message = first?.message || "The submitted data is not valid.";
  } else if (error.name === "JsonWebTokenError") {
    status = 401;
    message = "Your session is invalid. Please sign in again.";
  } else if (error.name === "TokenExpiredError") {
    status = 401;
    message = "Your session has expired. Please sign in again.";
  } else if (error.name === "MulterError") {
    status = 400;
    message =
      error.code === "LIMIT_FILE_SIZE"
        ? "That file is too large."
        : "That upload could not be processed.";
  } else if (
    error.type === "entity.parse.failed" ||
    error.type === "entity.too.large"
  ) {
    status = error.type === "entity.too.large" ? 413 : 400;
    message =
      status === 413
        ? "That request body is too large."
        : "The request body is not valid JSON.";
  } else if (
    error.code === 11000 ||
    error.name === "MongoServerError"
  ) {
    status = 409;
    message = "A record with those details already exists.";
  }

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, error);
  }

  return res.status(status).json({
    success: false,
    message: publicMessage(status, message, error),
  });
};

/**
 * 4xx messages are safe to return verbatim (they are written for the client).
 * 5xx messages are replaced in production so internals are never leaked.
 */
const publicMessage = (status, message, error) => {
  if (status < 500) return message;
  return env.isProduction
    ? "Something went wrong on our end."
    : error?.message || message;
};

export default errorHandler;
