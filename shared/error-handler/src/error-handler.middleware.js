import { sendResponse } from "@shared/utils";

/**
 * HTTP status codes
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns standardized response
 */
export const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || req.headers["x-correlation-id"];

  // Log error with correlation ID
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId,
      event: "ERROR",
      error: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
    })
  );

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
    const field = Object.keys(err.keyPattern || {})[0];
    return sendResponse(
      res,
      HTTP_STATUS.CONFLICT,
      "Duplicate entry",
      null,
      field ? `${field} already exists` : "Duplicate entry found"
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
      "Authentication token is invalid"
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

  // Custom application errors
  if (err.isOperational) {
    return sendResponse(
      res,
      err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      err.message || "Error occurred",
      null,
      err.message
    );
  }

  // Default to internal server error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message =
    process.env.NODE_ENV === "production"
      ? "An unexpected error occurred"
      : err.message || "Internal server error";

  return sendResponse(res, statusCode, "Error occurred", null, message);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  const correlationId = req.correlationId || req.headers["x-correlation-id"];

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId,
      event: "NOT_FOUND",
      method: req.method,
      path: req.originalUrl,
    })
  );

  return sendResponse(
    res,
    HTTP_STATUS.NOT_FOUND,
    "Route not found",
    null,
    `Cannot ${req.method} ${req.originalUrl}`
  );
};

export default {
  errorHandler,
  notFoundHandler,
};
