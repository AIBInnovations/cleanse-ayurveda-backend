import { Router } from "express";
import {
  login,
  logout,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "./admin.controller.js";
import {
  loginSchema,
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  validate,
} from "./admin.validator.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";

const router = Router();

/**
 * @route POST /api/admin/auth/login
 * @description Admin login with email and password
 * @access Public
 */
router.post("/login", validate(loginSchema), login);

/**
 * @route POST /api/admin/auth/logout
 * @description Admin logout and invalidate session
 * @access Private (admin authenticated)
 */
router.post("/logout", authenticateAdmin, logout);

/**
 * @route POST /api/admin/auth/change-password
 * @description Change admin password
 * @access Private (admin authenticated)
 * Note: Allowed even when forcePasswordChange is true
 */
router.post("/change-password", authenticateAdmin, validate(changePasswordSchema), changePassword);

/**
 * @route POST /api/admin/auth/password/request-reset
 * @description Request admin password reset (generates reset token)
 * @access Public
 */
router.post("/password/request-reset", validate(requestPasswordResetSchema), requestPasswordReset);

/**
 * @route POST /api/admin/auth/password/reset
 * @description Reset admin password using reset token
 * @access Public
 */
router.post("/password/reset", validate(resetPasswordSchema), resetPassword);

export default router;
