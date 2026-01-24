import { verifyAccessToken, extractToken } from "./token.service.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS, USER_TYPE } from "./constants.js";

/**
 * Authenticate user middleware
 * Verifies access token and attaches user info to request
 * Does not query database - only validates JWT
 * @route Middleware for protected user routes
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

    if (decoded.userType !== USER_TYPE.CONSUMER) {
      console.log(`Invalid user type: expected consumer, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Invalid user type for this resource"
      );
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      userType: decoded.userType,
    };
    req.userId = decoded.userId;
    req.userType = decoded.userType;
    req.accessToken = token;

    console.log(`User authenticated: ${req.userId}`);
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
 * Authenticate admin middleware
 * Verifies access token and ensures user is admin
 * @route Middleware for protected admin routes
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      console.log("No token provided in admin request");
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
      console.log("Invalid or expired admin access token");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "Invalid or expired token"
      );
    }

    if (decoded.userType !== USER_TYPE.ADMIN) {
      console.log(`Access denied: expected admin, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Admin access required"
      );
    }

    // Attach admin info to request
    req.user = {
      userId: decoded.userId,
      userType: decoded.userType,
      adminId: decoded.adminId,
    };
    req.userId = decoded.userId;
    req.adminId = decoded.adminId;
    req.userType = decoded.userType;
    req.accessToken = token;

    console.log(`Admin authenticated: ${req.adminId}`);
    next();
  } catch (error) {
    console.log(`Admin authentication error: ${error.message}`);
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
      req.userType = null;
      return next();
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      req.user = null;
      req.userId = null;
      req.userType = null;
      return next();
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      userType: decoded.userType,
    };
    req.userId = decoded.userId;
    req.userType = decoded.userType;
    req.accessToken = token;

    console.log(`Optional auth: User authenticated: ${req.userId}`);
    next();
  } catch (error) {
    console.log(`Optional auth error: ${error.message}`);
    req.user = null;
    req.userId = null;
    req.userType = null;
    next();
  }
};

/**
 * RBAC middleware - check if user has required permission
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @returns {Function} Express middleware
 */
export const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "No authenticated user"
      );
    }

    // Get permissions from JWT token or user object
    const userPermissions = req.user.permissions || [];

    // Convert single permission to array
    const permissions = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Check if user has at least one of the required permissions
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      console.log(
        `Permission denied: user ${req.userId} lacks required permissions [${permissions.join(", ")}]`
      );

      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Insufficient permissions"
      );
    }

    next();
  };
};

/**
 * Service-to-service authentication middleware
 * Validates service API key or service JWT token
 */
export const authenticateService = (req, res, next) => {
  try {
    // Check for service API key
    const apiKey = req.headers["x-api-key"];
    const serviceId = req.headers["x-service-id"];

    if (!apiKey || !serviceId) {
      console.log("Missing service authentication credentials");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Service authentication required",
        null,
        "Missing service credentials"
      );
    }

    // Validate service API key (compare with environment variable)
    const expectedApiKey = process.env[`SERVICE_API_KEY_${serviceId.toUpperCase()}`];

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      console.log(`Invalid API key for service: ${serviceId}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Service authentication failed",
        null,
        "Invalid service credentials"
      );
    }

    // Attach service info to request
    req.serviceId = serviceId;
    req.isServiceRequest = true;

    console.log(`Service authenticated: ${serviceId}`);
    next();
  } catch (error) {
    console.log(`Service authentication error: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Service authentication error",
      null,
      error.message
    );
  }
};
