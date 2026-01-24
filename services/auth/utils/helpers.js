/**
 * Utility helper functions
 */

/**
 * Extract client IP from request
 * @param {object} req - Express request object
 * @returns {string|null} Client IP address
 */
export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || null;
};

/**
 * Extract user agent from request
 * @param {object} req - Express request object
 * @returns {string|null} User agent string
 */
export const getUserAgent = (req) => {
  return req.headers["user-agent"] || null;
};

/**
 * Extract device info from request
 * @param {object} req - Express request object
 * @returns {object} Device information
 */
export const extractDeviceInfo = (req) => {
  const userAgent = getUserAgent(req);
  const ip = getClientIp(req);

  let deviceType = "unknown";
  let os = "unknown";
  let browser = "unknown";

  if (userAgent) {
    // Detect device type
    if (/mobile/i.test(userAgent)) {
      deviceType = "mobile";
    } else if (/tablet/i.test(userAgent)) {
      deviceType = "tablet";
    } else {
      deviceType = "desktop";
    }

    // Detect OS
    if (/windows/i.test(userAgent)) {
      os = "Windows";
    } else if (/macintosh|mac os/i.test(userAgent)) {
      os = "macOS";
    } else if (/linux/i.test(userAgent)) {
      os = "Linux";
    } else if (/android/i.test(userAgent)) {
      os = "Android";
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      os = "iOS";
    }

    // Detect browser
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
      browser = "Chrome";
    } else if (/firefox/i.test(userAgent)) {
      browser = "Firefox";
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      browser = "Safari";
    } else if (/edge/i.test(userAgent)) {
      browser = "Edge";
    }
  }

  return {
    deviceId: req.headers["x-device-id"] || null,
    deviceType,
    os,
    browser,
    ip,
    userAgent,
  };
};

/**
 * Sanitize object for logging (remove sensitive fields)
 * @param {object} obj - Object to sanitize
 * @param {string[]} sensitiveFields - Fields to remove
 * @returns {object} Sanitized object
 */
export const sanitizeForLog = (
  obj,
  sensitiveFields = ["password", "passwordHash", "token", "accessToken", "refreshToken", "otp", "otpHash"]
) => {
  if (!obj || typeof obj !== "object") {
    return obj;
  }

  const sanitized = { ...obj };
  sensitiveFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  });

  return sanitized;
};

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateRandomString = (length = 32) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if a value is a valid MongoDB ObjectId
 * @param {string} id - ID to check
 * @returns {boolean} Whether the ID is valid
 */
export const isValidObjectId = (id) => {
  if (!id) return false;
  return /^[a-fA-F0-9]{24}$/.test(id.toString());
};

/**
 * Format phone number (ensure +91 prefix for India)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (phone.startsWith("+")) {
    return phone;
  }

  return phone;
};
