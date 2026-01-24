import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns standardized response
 */
export const errorHandler = (err, req, res, next) => {
  console.log(`Error: ${err.message}`);
  console.log(`Stack: ${err.stack}`);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      "Validation failed",
      null,
      messages.join(", ")
    );
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendResponse(
      res,
      HTTP_STATUS.CONFLICT,
      "Duplicate entry",
      null,
      `${field} already exists`
    );
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return sendResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      "Invalid ID format",
      null,
      `Invalid ${err.path}: ${err.value}`
    );
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Invalid token",
      null,
      err.message
    );
  }

  if (err.name === "TokenExpiredError") {
    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Token expired",
      null,
      "Your session has expired. Please login again."
    );
  }

  // Default to internal server error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal server error";

  return sendResponse(res, statusCode, "Error occurred", null, message);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  console.log(`Route not found: ${req.method} ${req.originalUrl}`);
  return sendResponse(
    res,
    HTTP_STATUS.NOT_FOUND,
    "Route not found",
    null,
    `Cannot ${req.method} ${req.originalUrl}`
  );
};

/**
 * Request logger middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`
    );
  });

  console.log(`Incoming: ${req.method} ${req.originalUrl}`);
  if (Object.keys(req.body || {}).length > 0) {
    const sanitizedBody = { ...req.body };
    const sensitiveFields = ["password", "otp", "token", "accessToken", "refreshToken"];
    sensitiveFields.forEach((field) => {
      if (field in sanitizedBody) {
        sanitizedBody[field] = "[REDACTED]";
      }
    });
    console.log(`Request body:`, JSON.stringify(sanitizedBody));
  }

  next();
};

export default {
  errorHandler,
  notFoundHandler,
  requestLogger,
};
