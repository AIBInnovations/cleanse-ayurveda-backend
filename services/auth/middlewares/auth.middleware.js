import { verifyAccessToken } from "../services/token.service.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS, SESSION_USER_TYPE } from "../utils/constants.js";
import User from "../models/user.model.js";
import Session from "../models/session.model.js";

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
 * Authenticate consumer user
 * Verifies access token and attaches user to request
 * @route Middleware for protected consumer routes
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      console.log("No token provided in request");
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
      console.log("Invalid or expired access token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "Invalid or expired token"
      );
    }

    if (decoded.userType !== SESSION_USER_TYPE.CONSUMER) {
      console.log(`Invalid user type: expected consumer, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Invalid user type for this resource"
      );
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      console.log(`User not found: ${decoded.userId}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "User not found"
      );
    }

    if (user.status !== "active") {
      console.log(`User account not active: ${user.status}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account not active",
        null,
        `Account is ${user.status}`
      );
    }

    req.user = user;
    req.userId = user._id;
    req.accessToken = token;

    console.log(`User authenticated: ${user._id}`);
    next();
  } catch (error) {
    console.log(`Authentication error: ${error.message}`);
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
 * Optional authentication
 * Attaches user if token is valid, continues if not
 * @route Middleware for routes that work with or without auth
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const decoded = verifyAccessToken(token);

    if (!decoded || decoded.userType !== SESSION_USER_TYPE.CONSUMER) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user || user.status !== "active") {
      req.user = null;
      req.userId = null;
      return next();
    }

    req.user = user;
    req.userId = user._id;
    req.accessToken = token;

    console.log(`Optional auth: User authenticated: ${user._id}`);
    next();
  } catch (error) {
    console.log(`Optional auth error: ${error.message}`);
    req.user = null;
    req.userId = null;
    next();
  }
};

/**
 * Verify session is still active
 * Use after authenticateUser to ensure session hasn't been terminated
 */
export const verifyActiveSession = async (req, res, next) => {
  try {
    if (!req.accessToken) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Session verification failed",
        null,
        "No access token"
      );
    }

    const session = await Session.findOne({
      accessToken: req.accessToken,
      isActive: true,
    });

    if (!session) {
      console.log("Session not found or inactive");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Session expired",
        null,
        "Session has been terminated"
      );
    }

    req.session = session;
    req.sessionId = session._id;

    next();
  } catch (error) {
    console.log(`Session verification error: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Session verification error",
      null,
      error.message
    );
  }
};

export default {
  authenticateUser,
  optionalAuth,
  verifyActiveSession,
};
