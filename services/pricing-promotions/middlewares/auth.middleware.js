import jwt from "jsonwebtoken";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-change-in-production";

/**
 * Extract bearer token from authorization header
 * @param {object} req - Express request
 * @returns {string|null} Token or null
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {object|null} Decoded payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);

    if (decoded.type !== "access") {
      console.log("> Invalid token type: expected access token");
      return null;
    }

    return decoded;
  } catch (error) {
    console.log(`> Access token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Authenticate consumer user
 * Verifies access token and checks userType === "consumer"
 * @route Middleware for protected consumer routes
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      console.log("> No token provided in request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "No token provided"
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      console.log("> Invalid or expired access token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "Invalid or expired token"
      );
    }

    if (decoded.userType !== "consumer") {
      console.log(`> Invalid user type: expected consumer, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Invalid user type for this resource"
      );
    }

    req.userId = decoded.userId;
    req.userType = decoded.userType;
    req.accessToken = token;

    console.log(`> User authenticated: ${decoded.userId}`);
    next();
  } catch (error) {
    console.log(`> Authentication error: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Authentication error",
      null,
      error.message
    );
  }
};

/**
 * Authenticate admin user
 * Verifies access token and checks userType === "admin"
 * @route Middleware for protected admin routes
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      console.log("> No token provided in admin request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "No token provided"
      );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      console.log("> Invalid or expired admin access token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "Invalid or expired token"
      );
    }

    if (decoded.userType !== "admin") {
      console.log(`> Invalid user type for admin: expected admin, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Admin access required"
      );
    }

    req.userId = decoded.userId;
    req.adminId = decoded.userId;
    req.userType = decoded.userType;
    req.accessToken = token;

    console.log(`> Admin authenticated: ${decoded.userId}`);
    next();
  } catch (error) {
    console.log(`> Admin authentication error: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Authentication error",
      null,
      error.message
    );
  }
};

export default {
  authenticateUser,
  authenticateAdmin,
};
