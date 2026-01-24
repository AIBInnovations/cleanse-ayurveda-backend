import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";

/**
 * RBAC (Role-Based Access Control) middleware
 * Checks if the authenticated admin has the required permissions
 */

/**
 * Require a single permission
 * @param {string} permission - Required permission
 * @returns {function} Express middleware
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin || !req.permissions) {
      console.log("RBAC check failed: No admin or permissions in request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "Admin not authenticated"
      );
    }

    if (!req.permissions.includes(permission)) {
      console.log(
        `Permission denied: ${req.admin._id} lacks permission '${permission}'`
      );
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Permission denied",
        null,
        `Required permission: ${permission}`
      );
    }

    console.log(`Permission granted: ${permission} for admin ${req.admin._id}`);
    next();
  };
};

/**
 * Require any one of the specified permissions
 * @param {string[]} permissions - Array of permissions (any match grants access)
 * @returns {function} Express middleware
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.admin || !req.permissions) {
      console.log("RBAC check failed: No admin or permissions in request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "Admin not authenticated"
      );
    }

    const hasAny = permissions.some((p) => req.permissions.includes(p));

    if (!hasAny) {
      console.log(
        `Permission denied: ${req.admin._id} lacks any of [${permissions.join(", ")}]`
      );
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Permission denied",
        null,
        `Required any of: ${permissions.join(", ")}`
      );
    }

    console.log(`Permission granted: one of [${permissions.join(", ")}] for admin ${req.admin._id}`);
    next();
  };
};

/**
 * Require all specified permissions
 * @param {string[]} permissions - Array of permissions (all must match)
 * @returns {function} Express middleware
 */
export const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.admin || !req.permissions) {
      console.log("RBAC check failed: No admin or permissions in request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "Admin not authenticated"
      );
    }

    const missingPermissions = permissions.filter(
      (p) => !req.permissions.includes(p)
    );

    if (missingPermissions.length > 0) {
      console.log(
        `Permission denied: ${req.admin._id} lacks [${missingPermissions.join(", ")}]`
      );
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Permission denied",
        null,
        `Missing permissions: ${missingPermissions.join(", ")}`
      );
    }

    console.log(`All permissions granted: [${permissions.join(", ")}] for admin ${req.admin._id}`);
    next();
  };
};

/**
 * Check if admin is super_admin
 * @returns {function} Express middleware
 */
export const requireSuperAdmin = () => {
  return (req, res, next) => {
    if (!req.admin || !req.role) {
      console.log("Super admin check failed: No admin or role in request");
      return sendResponse(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Authentication required",
        null,
        "Admin not authenticated"
      );
    }

    if (req.role.name !== "super_admin") {
      console.log(`Super admin required: ${req.admin._id} has role ${req.role.name}`);
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Super admin access required",
        null,
        "This action requires super admin privileges"
      );
    }

    console.log(`Super admin verified: ${req.admin._id}`);
    next();
  };
};

/**
 * ABAC helper: Check if admin can act on a resource based on attributes
 * @param {function} checkFn - Function that receives (req, resource) and returns boolean
 * @param {function} getResourceFn - Function to get the resource from request
 * @returns {function} Express middleware
 */
export const requireAttribute = (checkFn, getResourceFn) => {
  return async (req, res, next) => {
    try {
      const resource = await getResourceFn(req);

      if (!resource) {
        return sendResponse(
          res,
          HTTP_STATUS.NOT_FOUND,
          "Resource not found",
          null,
          "The requested resource does not exist"
        );
      }

      const allowed = await checkFn(req, resource);

      if (!allowed) {
        console.log(`Attribute check failed for admin ${req.admin?._id}`);
        return sendResponse(
          res,
          HTTP_STATUS.FORBIDDEN,
          "Access denied",
          null,
          "You do not have access to this resource"
        );
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.log(`Attribute check error: ${error.message}`);
      return sendResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Access check failed",
        null,
        error.message
      );
    }
  };
};

export default {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSuperAdmin,
  requireAttribute,
};
