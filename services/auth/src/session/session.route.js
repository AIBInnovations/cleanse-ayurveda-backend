import { Router } from "express";
import {
  getActiveSessions,
  getCurrentSession,
  terminateSession,
  terminateAllOtherSessions,
  getAdminActiveSessions,
  forceLogoutAdmin,
  forceLogoutAllAdmins,
  validateSession,
} from "./session.controller.js";
import {
  terminateSessionSchema,
  adminTerminateSessionSchema,
  validateParams,
} from "./session.validator.js";
import {
  authenticateUser,
  verifyActiveSession,
} from "../../middlewares/auth.middleware.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// INTERNAL/PUBLIC ROUTES
//

/**
 * @route GET /api/session/validate
 * @description Validate session for gateway authentication
 * @access Internal (called by gateway middleware)
 * @note No authentication middleware - validates token directly from header
 */
router.get("/validate", validateSession);

//
// CONSUMER SESSION ROUTES
//

/**
 * @route GET /api/sessions
 * @description Get all active sessions for current user
 * @access Private (consumer authenticated)
 */
router.get("/", authenticateUser, verifyActiveSession, getActiveSessions);

/**
 * @route GET /api/sessions/current
 * @description Get current session details
 * @access Private (consumer authenticated)
 */
router.get(
  "/current",
  authenticateUser,
  verifyActiveSession,
  getCurrentSession,
);

/**
 * @route DELETE /api/sessions/all/others
 * @description Terminate all sessions except current
 * @access Private (consumer authenticated)
 * @note This route must come before /:sessionId to avoid matching "all" as sessionId
 */
router.delete(
  "/all/others",
  authenticateUser,
  verifyActiveSession,
  terminateAllOtherSessions,
);

/**
 * @route DELETE /api/sessions/:sessionId
 * @description Terminate a specific session
 * @access Private (consumer authenticated)
 */
router.delete(
  "/:sessionId",
  authenticateUser,
  verifyActiveSession,
  validateParams(terminateSessionSchema),
  terminateSession,
);

//
// ADMIN SESSION ROUTES
//

/**
 * @route GET /api/sessions/admin
 * @description Get all active admin sessions
 * @access Private (admin authenticated, requires sessions.view)
 */
router.get(
  "/admin",
  authenticateAdmin,
  requirePermission(PERMISSIONS.SESSIONS_VIEW),
  getAdminActiveSessions,
);

/**
 * @route DELETE /api/sessions/admin/all/emergency
 * @description Emergency logout all admin sessions
 * @access Private (admin authenticated, requires sessions.emergency)
 * @note This route must come before /admin/:sessionId to avoid matching "all" as sessionId
 */
router.delete(
  "/admin/all/emergency",
  authenticateAdmin,
  requirePermission(PERMISSIONS.SESSIONS_EMERGENCY),
  forceLogoutAllAdmins,
);

/**
 * @route DELETE /api/sessions/admin/:sessionId
 * @description Force logout an admin session
 * @access Private (admin authenticated, requires sessions.manage)
 */
router.delete(
  "/admin/:sessionId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.SESSIONS_MANAGE),
  validateParams(adminTerminateSessionSchema),
  forceLogoutAdmin,
);

export default router;
