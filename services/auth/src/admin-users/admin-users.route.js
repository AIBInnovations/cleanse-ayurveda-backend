import { Router } from "express";
import {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  assignRole,
  suspendAdmin,
  reactivateAdmin,
} from "./admin-users.controller.js";
import {
  createAdminSchema,
  updateAdminSchema,
  adminIdParamSchema,
  assignRoleSchema,
  searchAdminsSchema,
  validate,
  validateParams,
  validateQuery,
} from "./admin-users.validator.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// ADMIN USER MANAGEMENT ROUTES
// All routes require admin authentication
//

/**
 * @route GET /api/admin/users
 * @description Get all admins with role info (paginated)
 * @access Private (admin authenticated, requires admins.view)
 */
router.get(
  "/",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_VIEW),
  validateQuery(searchAdminsSchema),
  getAdmins,
);

/**
 * @route POST /api/admin/users
 * @description Create a new admin user
 * @access Private (admin authenticated, requires admins.manage)
 */
router.post(
  "/",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validate(createAdminSchema),
  createAdmin,
);

/**
 * @route GET /api/admin/users/:adminId
 * @description Get a single admin by ID
 * @access Private (admin authenticated, requires admins.view)
 */
router.get(
  "/:adminId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_VIEW),
  validateParams(adminIdParamSchema),
  getAdmin,
);

/**
 * @route PATCH /api/admin/users/:adminId
 * @description Update an admin's details
 * @access Private (admin authenticated, requires admins.manage)
 */
router.patch(
  "/:adminId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validateParams(adminIdParamSchema),
  validate(updateAdminSchema),
  updateAdmin,
);

/**
 * @route PATCH /api/admin/users/:adminId/role
 * @description Assign a new role to an admin
 * @access Private (admin authenticated, requires admins.manage)
 */
router.patch(
  "/:adminId/role",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validateParams(adminIdParamSchema),
  validate(assignRoleSchema),
  assignRole,
);

/**
 * @route POST /api/admin/users/:adminId/suspend
 * @description Suspend an admin account
 * @access Private (admin authenticated, requires admins.manage)
 */
router.post(
  "/:adminId/suspend",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validateParams(adminIdParamSchema),
  suspendAdmin,
);

/**
 * @route POST /api/admin/users/:adminId/reactivate
 * @description Reactivate a suspended admin account
 * @access Private (admin authenticated, requires admins.manage)
 */
router.post(
  "/:adminId/reactivate",
  authenticateAdmin,
  requirePermission(PERMISSIONS.ADMINS_MANAGE),
  validateParams(adminIdParamSchema),
  reactivateAdmin,
);

export default router;
