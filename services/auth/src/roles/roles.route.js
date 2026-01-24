import { Router } from "express";
import {
  getAllRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
  getAdminsByRole,
} from "./roles.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignPermissionsSchema,
  removePermissionsSchema,
  validate,
  validateParams,
} from "./roles.validator.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// ROLE MANAGEMENT ROUTES
// All routes require admin authentication
//

/**
 * @route GET /api/admin/roles
 * @description Get all roles with permissions
 * @access Private (admin authenticated, requires roles.view)
 */
router.get(
  "/",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getAllRoles,
);

/**
 * @route POST /api/admin/roles
 * @description Create a new role
 * @access Private (admin authenticated, requires roles.manage)
 */
router.post(
  "/",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validate(createRoleSchema),
  createRole,
);

/**
 * @route GET /api/admin/roles/:roleId
 * @description Get a single role by ID
 * @access Private (admin authenticated, requires roles.view)
 */
router.get(
  "/:roleId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_VIEW),
  validateParams(roleIdParamSchema),
  getRole,
);

/**
 * @route PATCH /api/admin/roles/:roleId
 * @description Update a role
 * @access Private (admin authenticated, requires roles.manage)
 */
router.patch(
  "/:roleId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validateParams(roleIdParamSchema),
  validate(updateRoleSchema),
  updateRole,
);

/**
 * @route DELETE /api/admin/roles/:roleId
 * @description Delete a role
 * @access Private (admin authenticated, requires roles.manage)
 */
router.delete(
  "/:roleId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validateParams(roleIdParamSchema),
  deleteRole,
);

/**
 * @route PUT /api/admin/roles/:roleId/permissions
 * @description Replace all permissions for a role
 * @access Private (admin authenticated, requires roles.manage)
 */
router.put(
  "/:roleId/permissions",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validateParams(roleIdParamSchema),
  validate(assignPermissionsSchema),
  assignPermissions,
);

/**
 * @route DELETE /api/admin/roles/:roleId/permissions
 * @description Remove specific permissions from a role
 * @access Private (admin authenticated, requires roles.manage)
 */
router.delete(
  "/:roleId/permissions",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  validateParams(roleIdParamSchema),
  validate(removePermissionsSchema),
  removePermissions,
);

/**
 * @route GET /api/admin/roles/:roleId/admins
 * @description Get all admins assigned to a role
 * @access Private (admin authenticated, requires roles.view)
 */
router.get(
  "/:roleId/admins",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ROLES_VIEW),
  validateParams(roleIdParamSchema),
  getAdminsByRole,
);

export default router;
