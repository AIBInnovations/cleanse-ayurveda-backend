import jwt from "jsonwebtoken";
import { TOKEN_EXPIRY } from "../utils/constants.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-change-in-production";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret-change-in-production";

/**
 * Token service for JWT generation and verification
 */

/**
 * Generate access token
 * @param {object} payload - Token payload
 * @param {string} payload.userId - User/Admin ID
 * @param {string} payload.userType - Type (consumer/admin)
 * @param {string} [payload.roleId] - Role ID for admins
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  const expiry = process.env.JWT_ACCESS_EXPIRY || TOKEN_EXPIRY.ACCESS_TOKEN;

  const token = jwt.sign(
    {
      userId: payload.userId,
      userType: payload.userType,
      roleId: payload.roleId || null,
      type: "access",
    },
    ACCESS_SECRET,
    { expiresIn: expiry }
  );

  console.log(`Access token generated for ${payload.userType}: ${payload.userId}`);
  return token;
};

/**
 * Generate refresh token
 * @param {object} payload - Token payload
 * @param {string} payload.userId - User/Admin ID
 * @param {string} payload.userType - Type (consumer/admin)
 * @param {string} payload.sessionId - Session ID
 * @param {boolean} [rememberMe=false] - Extended expiry for remember me
 * @returns {object} Token and expiry date
 */
export const generateRefreshToken = (payload, rememberMe = false) => {
  const expiry = rememberMe
    ? process.env.JWT_REMEMBER_ME_EXPIRY || TOKEN_EXPIRY.REMEMBER_ME_REFRESH_TOKEN
    : process.env.JWT_REFRESH_EXPIRY || TOKEN_EXPIRY.REFRESH_TOKEN;

  const token = jwt.sign(
    {
      userId: payload.userId,
      userType: payload.userType,
      sessionId: payload.sessionId,
      type: "refresh",
    },
    REFRESH_SECRET,
    { expiresIn: expiry }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  console.log(`Refresh token generated for ${payload.userType}: ${payload.userId}`);
  return { token, expiresAt };
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {object|null} Decoded payload or null if invalid
 */
export const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    if (decoded.type !== "access") {
      console.log("Invalid token type: expected access token");
      return null;
    }

    return decoded;
  } catch (error) {
    console.log(`Access token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object|null} Decoded payload or null if invalid
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);

    if (decoded.type !== "refresh") {
      console.log("Invalid token type: expected refresh token");
      return null;
    }

    return decoded;
  } catch (error) {
    console.log(`Refresh token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Generate password reset token
 * @param {string} adminId - Admin ID
 * @returns {object} Token and expiry date
 */
export const generatePasswordResetToken = (adminId) => {
  const expiry = TOKEN_EXPIRY.PASSWORD_RESET_TOKEN;

  const token = jwt.sign(
    {
      adminId,
      type: "password_reset",
    },
    ACCESS_SECRET,
    { expiresIn: expiry }
  );

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  console.log(`Password reset token generated for admin: ${adminId}`);
  return { token, expiresAt };
};

/**
 * Verify password reset token
 * @param {string} token - Password reset token
 * @returns {object|null} Decoded payload or null if invalid
 */
export const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    if (decoded.type !== "password_reset") {
      console.log("Invalid token type: expected password_reset token");
      return null;
    }

    return decoded;
  } catch (error) {
    console.log(`Password reset token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.log(`Token decode failed: ${error.message}`);
    return null;
  }
};

/**
 * Calculate expiry date from string duration
 * @param {string} duration - Duration string (e.g., "7d", "15m")
 * @returns {Date} Expiry date
 */
export const calculateExpiryDate = (duration) => {
  const now = Date.now();
  let ms = 0;

  if (duration.endsWith("d")) {
    ms = parseInt(duration) * 24 * 60 * 60 * 1000;
  } else if (duration.endsWith("h")) {
    ms = parseInt(duration) * 60 * 60 * 1000;
  } else if (duration.endsWith("m")) {
    ms = parseInt(duration) * 60 * 1000;
  } else if (duration.endsWith("s")) {
    ms = parseInt(duration) * 1000;
  }

  return new Date(now + ms);
};

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  decodeToken,
  calculateExpiryDate,
};
