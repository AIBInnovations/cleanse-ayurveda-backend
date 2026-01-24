import jwt from "jsonwebtoken";

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token or null if invalid
 */
export const verifyAccessToken = (token) => {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET not configured");
    }
    return jwt.verify(token, secret);
  } catch (error) {
    console.log(`Token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Extract bearer token from authorization header
 * @param {object} req - Express request
 * @returns {string|null} Token or null
 */
export const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
};
