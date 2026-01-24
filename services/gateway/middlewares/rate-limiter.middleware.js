import rateLimit from "express-rate-limit";
import { RATE_LIMIT_CONFIG, HTTP_STATUS } from "../utils/constants.js";
import { sendResponse } from "@shared/utils";

/**
 * Rate limiter middleware
 * Implements token bucket algorithm to prevent abuse
 */
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: RATE_LIMIT_CONFIG.SKIP_SUCCESSFUL_REQUESTS,
  skipFailedRequests: RATE_LIMIT_CONFIG.SKIP_FAILED_REQUESTS,

  // Custom key generator (use IP or user ID if available)
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },

  // Custom handler when rate limit is exceeded
  handler: (req, res) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "RATE_LIMIT_EXCEEDED",
        ip: req.ip,
        userId: req.userId,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      "Too many requests",
      null,
      "Rate limit exceeded. Please try again later."
    );
  },
});
