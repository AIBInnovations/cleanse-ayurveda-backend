import { Router } from "express";
import {
  getAuditLogs,
  getAuditLogsByEntity,
  getAuditLogsByActor,
} from "./audit.controller.js";
import {
  queryAuditLogsSchema,
  entityParamsSchema,
  actorParamsSchema,
  paginationSchema,
  validateQuery,
  validateParams,
} from "./audit.validator.js";
import { authenticateAdmin } from "../../middlewares/admin.middleware.js";
import { requirePermission } from "../../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../../utils/constants.js";

const router = Router();

//
// AUDIT LOG ROUTES
// All routes require admin authentication and audit.view permission
//

/**
 * @route GET /api/admin/audit
 * @description Get audit logs with filtering and pagination
 * @access Private (admin authenticated, requires audit.view)
 */
router.get(
  "/",
  authenticateAdmin,
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  validateQuery(queryAuditLogsSchema),
  getAuditLogs,
);

/**
 * @route GET /api/admin/audit/entity/:entityType/:entityId
 * @description Get all audit logs for a specific entity
 * @access Private (admin authenticated, requires audit.view)
 */
router.get(
  "/entity/:entityType/:entityId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  validateParams(entityParamsSchema),
  validateQuery(paginationSchema),
  getAuditLogsByEntity,
);

/**
 * @route GET /api/admin/audit/actor/:actorType/:actorId
 * @description Get all audit logs by a specific actor
 * @access Private (admin authenticated, requires audit.view)
 */
router.get(
  "/actor/:actorType/:actorId",
  authenticateAdmin,
  requirePermission(PERMISSIONS.AUDIT_VIEW),
  validateParams(actorParamsSchema),
  validateQuery(paginationSchema),
  getAuditLogsByActor,
);

export default router;
