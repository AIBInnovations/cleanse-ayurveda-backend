import { sendResponse } from "@shared/utils";
import { HTTP_STATUS, RATE_LIMIT } from "../utils/constants.js";
import { getClientIp } from "../utils/helpers.js";

/**
 * In-memory rate limiting store
 * Note: For production, use Redis for distributed rate limiting
 */
const rateLimitStore = new Map();

/**
 * Clean up expired entries periodically
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Prevent the interval from keeping the process alive
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Generic rate limiter factory
 * @param {object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {string} options.keyPrefix - Prefix for the rate limit key
 * @param {function} [options.keyGenerator] - Custom key generator function
 * @param {string} [options.message] - Custom error message
 * @returns {function} Express middleware
 */
export const createRateLimiter = (options) => {
  const {
    windowMs,
    maxRequests,
    keyPrefix,
    keyGenerator,
    message = "Too many requests, please try again later",
  } = options;

  return (req, res, next) => {
    const key = keyGenerator
      ? `${keyPrefix}:${keyGenerator(req)}`
      : `${keyPrefix}:${getClientIp(req)}`;

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || record.resetAt < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      console.log(`Rate limit exceeded for key: ${key}`);

      res.set("Retry-After", retryAfter);
      return sendResponse(
        res,
        HTTP_STATUS.TOO_MANY_REQUESTS,
        message,
        { retryAfter },
        "Rate limit exceeded"
      );
    }

    record.count++;
    next();
  };
};

/**
 * OTP request rate limiter
 * Limits OTP requests per phone/email
 */
export const otpRateLimit = createRateLimiter({
  windowMs: RATE_LIMIT.OTP_WINDOW_MS,
  maxRequests: RATE_LIMIT.OTP_MAX_REQUESTS,
  keyPrefix: "otp",
  keyGenerator: (req) => req.body.phone || req.body.email || getClientIp(req),
  message: "Too many OTP requests. Please wait before requesting again.",
});

/**
 * Login attempt rate limiter
 * Limits login attempts per IP
 */
export const loginRateLimit = createRateLimiter({
  windowMs: RATE_LIMIT.LOGIN_WINDOW_MS,
  maxRequests: RATE_LIMIT.LOGIN_MAX_ATTEMPTS,
  keyPrefix: "login",
  message: "Too many login attempts. Please try again later.",
});

/**
 * General API rate limiter
 * Limits overall API requests per IP
 */
export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  keyPrefix: "api",
  message: "Too many requests. Please slow down.",
});

/**
 * Strict rate limiter for sensitive operations
 * E.g., password reset, account deletion
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  keyPrefix: "strict",
  message: "Too many attempts. Please try again after an hour.",
});

/**
 * Rate limiter by user ID (for authenticated routes)
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {function} Express middleware
 */
export const userRateLimit = (maxRequests = 30, windowMs = 60000) => {
  return createRateLimiter({
    windowMs,
    maxRequests,
    keyPrefix: "user",
    keyGenerator: (req) => req.userId?.toString() || getClientIp(req),
    message: "Too many requests. Please slow down.",
  });
};

/**
 * Reset rate limit for a specific key
 * @param {string} keyPrefix - Key prefix
 * @param {string} identifier - Identifier (IP, phone, etc.)
 */
export const resetRateLimit = (keyPrefix, identifier) => {
  const key = `${keyPrefix}:${identifier}`;
  rateLimitStore.delete(key);
  console.log(`Rate limit reset for key: ${key}`);
};

/**
 * Get current rate limit status for a key
 * @param {string} keyPrefix - Key prefix
 * @param {string} identifier - Identifier
 * @returns {object|null} Rate limit status
 */
export const getRateLimitStatus = (keyPrefix, identifier) => {
  const key = `${keyPrefix}:${identifier}`;
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt < Date.now()) {
    return null;
  }

  return {
    remaining: Math.max(0, record.count),
    resetAt: new Date(record.resetAt),
  };
};

export default {
  createRateLimiter,
  otpRateLimit,
  loginRateLimit,
  apiRateLimit,
  strictRateLimit,
  userRateLimit,
  resetRateLimit,
  getRateLimitStatus,
};
