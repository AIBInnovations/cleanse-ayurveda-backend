import { v4 as uuidv4 } from "uuid";

/**
 * Sensitive fields to sanitize in logs
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "newPassword",
  "oldPassword",
  "confirmPassword",
  "otp",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "secret",
  "privateKey",
  "creditCard",
  "cvv",
  "ssn",
];

/**
 * Sanitize sensitive data from object
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }

  return sanitized;
};

/**
 * Request logger middleware
 * Logs all incoming requests with structured logging
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Generate or extract correlation ID
  const correlationId = req.headers["x-correlation-id"] || uuidv4();
  req.correlationId = correlationId;

  // Add correlation ID to response headers
  res.setHeader("x-correlation-id", correlationId);

  // Log request start
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId,
      event: "REQUEST_START",
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      body: Object.keys(req.body || {}).length > 0 ? sanitizeObject(req.body) : undefined,
    })
  );

  // Log response finish
  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId,
        event: "REQUEST_END",
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      })
    );
  });

  next();
};

export default requestLogger;
