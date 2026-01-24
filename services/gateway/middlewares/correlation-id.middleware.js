import { v4 as uuidv4 } from "uuid";

/**
 * Correlation ID middleware
 * Generates or extracts correlation ID for request tracing
 */
export const correlationId = (req, res, next) => {
  // Check if correlation ID already exists in headers
  const correlationId = req.headers["x-correlation-id"] || uuidv4();

  // Attach to request
  req.correlationId = correlationId;

  // Add to response headers
  res.setHeader("x-correlation-id", correlationId);

  // Log request with correlation ID
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    })
  );

  next();
};
