import { verifyAccessToken } from "../services/token.service.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS, SESSION_USER_TYPE } from "../utils/constants.js";
import Admin from "../models/admin.model.js";
import Role from "../models/role.model.js";
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
 * Authenticate admin user
 * Verifies access token and attaches admin to request
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

    if (decoded.userType !== SESSION_USER_TYPE.ADMIN) {
      console.log(`Invalid user type for admin: expected admin, got ${decoded.userType}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Access denied",
        null,
        "Admin access required"
      );
    }

    const admin = await Admin.findById(decoded.userId)
      .select("-passwordHash -passwordResetToken")
      .populate("roleId");

    if (!admin) {
      console.log(`Admin not found: ${decoded.userId}`);
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication failed",
        null,
        "Admin not found"
      );
    }

    if (admin.status !== "active") {
      console.log(`Admin account not active: ${admin.status}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Account suspended",
        null,
        "Your admin account has been suspended"
      );
    }

    const session = await Session.findOne({
      accessToken: token,
      isActive: true,
      userType: "admin",
    });

    if (!session) {
      console.log("Admin session not found or inactive");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Session expired",
        null,
        "Session has been terminated"
      );
    }

    req.admin = admin;
    req.adminId = admin._id;
    req.role = admin.roleId;
    req.permissions = admin.roleId?.permissions || [];
    req.accessToken = token;
    req.session = session;
    req.sessionId = session._id;

    console.log(`Admin authenticated: ${admin._id} (${admin.roleId?.name})`);
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
 * Check if admin must change password
 * Blocks access to all routes except password change if forcePasswordChange is true
 * @param {string[]} allowedPaths - Paths to allow even with force password change
 */
export const checkForcePasswordChange = (allowedPaths = ["/change-password"]) => {
  return (req, res, next) => {
    if (!req.admin) {
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "Admin not authenticated"
      );
    }

    if (req.admin.forcePasswordChange) {
      const isAllowed = allowedPaths.some((path) => req.path.endsWith(path));

      if (!isAllowed) {
        console.log(`Admin ${req.admin._id} must change password before accessing other routes`);
        return sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Password change required",
          { forcePasswordChange: true },
          "You must change your password before continuing"
        );
      }
    }

    next();
  };
};

/**
 * Verify admin session is still active
 */
export const verifyAdminSession = async (req, res, next) => {
  try {
    if (!req.session) {
      const session = await Session.findOne({
        accessToken: req.accessToken,
        isActive: true,
        userType: "admin",
      });

      if (!session) {
        console.log("Admin session not found or inactive");
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
    }

    await Session.findByIdAndUpdate(req.sessionId, {
      lastActivityAt: new Date(),
    });

    next();
  } catch (error) {
    console.log(`Admin session verification error: ${error.message}`);
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
  authenticateAdmin,
  checkForcePasswordChange,
  verifyAdminSession,
};
