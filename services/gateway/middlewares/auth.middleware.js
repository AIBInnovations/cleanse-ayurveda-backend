import jwt from "jsonwebtoken";
import axios from "axios";
import { sendResponse } from "@shared/utils";
import { firebaseAdmin } from "@shared/config";
import { HTTP_STATUS, PUBLIC_ROUTES, ADMIN_ROUTES, OPTIONAL_AUTH_ROUTES } from "../utils/constants.js";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";
const SESSION_VALIDATION_ENABLED = process.env.SESSION_VALIDATION_ENABLED !== "false"; // Enable by default

/**
 * Extract bearer token from authorization header
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET not configured");
    }
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};

/**
 * Verify Firebase ID token
 */
const verifyFirebaseToken = async (token) => {
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    return null;
  }
};

/**
 * Check if route is public (doesn't require authentication)
 */
const isPublicRoute = (path) => {
  return PUBLIC_ROUTES.some((route) => {
    if (route.endsWith("*")) {
      return path.startsWith(route.slice(0, -1));
    }
    return path.startsWith(route);
  });
};

/**
 * Check if route requires admin access
 */
const isAdminRoute = (path) => {
  return ADMIN_ROUTES.some((route) => path.startsWith(route));
};

/**
 * Check if route uses optional authentication
 */
const isOptionalAuthRoute = (path) => {
  return OPTIONAL_AUTH_ROUTES.some((route) => path.startsWith(route));
};

/**
 * Gateway authentication middleware
 * Validates JWT tokens and enforces authentication requirements
 */
export const gatewayAuth = async (req, res, next) => {
  // Allow health check endpoint
  if (req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  // Check if route is public
  if (isPublicRoute(req.path)) {
    return next();
  }

  // Check if route uses optional authentication
  if (isOptionalAuthRoute(req.path)) {
    return optionalAuth(req, res, next);
  }

  // Extract and verify token
  const token = extractToken(req);

  if (!token) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "AUTH_FAILED",
        reason: "NO_TOKEN",
        path: req.path,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Authentication required",
      null,
      "No token provided"
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "AUTH_FAILED",
        reason: "INVALID_TOKEN",
        path: req.path,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Authentication failed",
      null,
      "Invalid or expired token"
    );
  }

  // Validate session with auth service
  if (SESSION_VALIDATION_ENABLED) {
    try {
      const sessionValidation = await axios.get(
        `${AUTH_SERVICE_URL}/api/session/validate`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-correlation-id": req.correlationId
          },
          timeout: 3000
        }
      );

      const validationData = sessionValidation.data?.data;

      if (!validationData || !validationData.isActive) {
        const reason = validationData?.reason || "Session not active";

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
            event: "AUTH_FAILED",
            reason: "SESSION_INACTIVE",
            details: reason,
            path: req.path,
          })
        );

        // Return 403 for suspended users, 401 for other cases
        if (reason === "User suspended") {
          return sendResponse(
            res,
            HTTP_STATUS.FORBIDDEN,
            "Account suspended",
            null,
            "Your account has been suspended. Please contact support."
          );
        }

        return sendResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "Session expired",
          null,
          "Your session has expired. Please login again."
        );
      }

      // Store session ID for downstream services
      req.sessionId = validationData.sessionId;

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "SESSION_VALIDATED",
          sessionId: req.sessionId,
          userId: validationData.userId,
          userStatus: validationData.userStatus,
          path: req.path,
        })
      );
    } catch (error) {
      // Graceful degradation: log error but continue with request
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "SESSION_VALIDATION_ERROR",
          error: error.message,
          path: req.path,
          note: "Continuing with JWT validation only"
        })
      );

      // In production, you may want to fail closed by uncommenting:
      // return sendResponse(
      //   res,
      //   HTTP_STATUS.SERVICE_UNAVAILABLE,
      //   "Authentication service unavailable",
      //   null,
      //   "Please try again later"
      // );
    }
  }

  // Check if admin route requires admin access
  if (isAdminRoute(req.path)) {
    if (decoded.userType !== "admin") {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "AUTH_FAILED",
          reason: "INSUFFICIENT_PERMISSIONS",
          path: req.path,
          userType: decoded.userType,
        })
      );

      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Admin access required"
      );
    }
  }

  // Attach user info to request based on user type
  req.userType = decoded.userType;
  req.accessToken = token;

  if (decoded.userType === "guest") {
    // For guest users, use userId from token as guestId
    req.guestId = decoded.userId;
    req.userId = null;
  } else {
    // For registered users (consumer/admin)
    req.userId = decoded.userId;
    req.guestId = null;
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "AUTH_SUCCESS",
      userId: req.userId,
      guestId: req.guestId,
      userType: req.userType,
      path: req.path,
    })
  );

  next();
};

/**
 * Optional authentication middleware
 * Tries to authenticate but doesn't fail if no token present
 * Useful for endpoints that work for both authenticated and anonymous users
 * Supports both JWT tokens and Firebase tokens
 */
export const optionalAuth = async (req, res, next) => {
  // Allow health check endpoint
  if (req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  // Extract token
  const token = extractToken(req);

  // If no token, continue without authentication
  if (!token) {
    req.userId = null;
    req.guestId = null;
    req.userType = null;
    req.accessToken = null;
    return next();
  }

  // Try to verify as JWT token first
  let decoded = verifyToken(token);

  // If JWT verification failed, try Firebase token
  if (!decoded) {
    const firebaseDecoded = await verifyFirebaseToken(token);

    if (firebaseDecoded) {
      // Firebase token is valid - fetch user from Auth service
      try {
        const userResponse = await axios.get(
          `${AUTH_SERVICE_URL}/api/users/by-firebase-uid/${firebaseDecoded.uid}`,
          {
            timeout: 3000
          }
        );

        const userData = userResponse.data?.data;

        if (userData && userData._id) {
          // User found - set authentication context
          req.userId = userData._id;
          req.userType = userData.type || "consumer";
          req.guestId = null;
          req.accessToken = token;

          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              correlationId: req.correlationId,
              event: "OPTIONAL_AUTH_SUCCESS_FIREBASE",
              userId: req.userId,
              userType: req.userType,
              firebaseUid: firebaseDecoded.uid,
              path: req.path,
            })
          );

          return next();
        } else {
          // User not found in database
          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              correlationId: req.correlationId,
              event: "OPTIONAL_AUTH_USER_NOT_FOUND",
              firebaseUid: firebaseDecoded.uid,
              path: req.path,
            })
          );
        }
      } catch (error) {
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
            event: "OPTIONAL_AUTH_USER_FETCH_ERROR",
            error: error.message,
            firebaseUid: firebaseDecoded.uid,
            path: req.path,
          })
        );
      }
    }

    // Firebase token invalid or user not found - continue without auth
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "OPTIONAL_AUTH_FAILED",
        reason: "INVALID_TOKEN",
        path: req.path,
      })
    );

    req.userId = null;
    req.guestId = null;
    req.userType = null;
    req.accessToken = null;
    return next();
  }

  // JWT token is valid - use decoded data
  // For optional auth, skip session validation and use JWT data directly
  // Session validation is optional - we trust the JWT signature
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "OPTIONAL_AUTH_SKIPPING_SESSION_VALIDATION",
      userType: decoded.userType,
      path: req.path,
    })
  );

  // Attach user info based on type
  req.userType = decoded.userType;
  req.accessToken = token;

  if (decoded.userType === "guest") {
    req.guestId = decoded.userId;
    req.userId = null;
  } else {
    req.userId = decoded.userId;
    req.guestId = null;
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "OPTIONAL_AUTH_SUCCESS",
      userId: req.userId,
      guestId: req.guestId,
      userType: req.userType,
      path: req.path,
    })
  );

  next();
};

/**
 * Require authentication or guest session middleware
 * Requires either a valid user session or guest session
 * Fails only if neither exists
 */
export const requireAuthOrGuest = async (req, res, next) => {
  // Allow health check endpoint
  if (req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  // Extract and verify token
  const token = extractToken(req);

  if (!token) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "AUTH_FAILED",
        reason: "NO_TOKEN",
        path: req.path,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Authentication required",
      null,
      "No token provided. Please login or create a guest session."
    );
  }

  const decoded = verifyToken(token);

  if (!decoded) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "AUTH_FAILED",
        reason: "INVALID_TOKEN",
        path: req.path,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      "Authentication failed",
      null,
      "Invalid or expired token"
    );
  }

  // Validate session with auth service
  if (SESSION_VALIDATION_ENABLED) {
    try {
      const sessionValidation = await axios.get(
        `${AUTH_SERVICE_URL}/api/session/validate`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "x-correlation-id": req.correlationId
          },
          timeout: 3000
        }
      );

      const validationData = sessionValidation.data?.data;

      if (!validationData || !validationData.isActive) {
        const reason = validationData?.reason || "Session not active";

        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId,
            event: "AUTH_FAILED",
            reason: "SESSION_INACTIVE",
            details: reason,
            path: req.path,
          })
        );

        if (reason === "User suspended") {
          return sendResponse(
            res,
            HTTP_STATUS.FORBIDDEN,
            "Account suspended",
            null,
            "Your account has been suspended. Please contact support."
          );
        }

        return sendResponse(
          res,
          HTTP_STATUS.UNAUTHORIZED,
          "Session expired",
          null,
          "Your session has expired. Please login again."
        );
      }

      req.sessionId = validationData.sessionId;

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "SESSION_VALIDATED",
          sessionId: req.sessionId,
          userId: validationData.userId,
          userType: decoded.userType,
          path: req.path,
        })
      );
    } catch (error) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
          event: "SESSION_VALIDATION_ERROR",
          error: error.message,
          path: req.path,
          note: "Continuing with JWT validation only"
        })
      );
    }
  }

  // Attach user info based on type
  req.userType = decoded.userType;
  req.accessToken = token;

  if (decoded.userType === "guest") {
    req.guestId = decoded.userId;
    req.userId = null;
  } else {
    req.userId = decoded.userId;
    req.guestId = null;
  }

  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "AUTH_OR_GUEST_SUCCESS",
      userId: req.userId,
      guestId: req.guestId,
      userType: req.userType,
      path: req.path,
    })
  );

  next();
};
