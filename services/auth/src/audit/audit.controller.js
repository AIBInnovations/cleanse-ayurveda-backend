import Audit from "../../models/audit.model.js";
import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../../utils/constants.js";

/**
 * @route GET /api/admin/audit
 * @description Get audit logs with filtering and pagination
 * @access Private (admin authenticated, requires audit.view)
 *
 * @query {
 *   actorId?: string,
 *   actorType?: "consumer" | "admin" | "system",
 *   action?: string,
 *   entityType?: string,
 *   entityId?: string,
 *   startDate?: string (ISO date),
 *   endDate?: string (ISO date),
 *   page?: number (default: 1),
 *   limit?: number (default: 20, max: 100)
 * }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Audit logs fetched successfully",
 *   "data": {
 *     "logs": [
 *       { "_id": "...", "actorId": "...", "actorType": "admin", "action": "ADMIN_LOGIN", "entityType": "Admin", "entityId": "...", "ip": "...", "createdAt": "..." }
 *     ],
 *     "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8, "hasNextPage": true, "hasPrevPage": false }
 *   }
 * }
 */
export const getAuditLogs = async (req, res) => {
  console.log("> Get audit logs request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Query:", req.query);

  try {
    const {
      actorId,
      actorType,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page,
      limit,
    } = req.query;

    // Build filter
    const filter = {};

    if (actorId) {
      filter.actorId = actorId;
    }

    if (actorType) {
      filter.actorType = actorType;
    }

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (entityId) {
      filter.entityId = entityId;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Audit.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch logs
    const logs = await Audit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`> Found ${logs.length} audit logs (total: ${total})`);
    console.log("> Response: pagination info");

    return sendResponse(res, HTTP_STATUS.OK, "Audit logs fetched successfully", {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log(`Get audit logs error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch audit logs",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/audit/entity/:entityType/:entityId
 * @description Get all audit logs for a specific entity
 * @access Private (admin authenticated, requires audit.view)
 *
 * @params { entityType: "User" | "Admin" | "Session" | "Address" | "Role", entityId: "MongoDB ObjectId" }
 * @query { page?: number (default: 1), limit?: number (default: 20, max: 100) }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Entity audit logs fetched successfully",
 *   "data": {
 *     "entityType": "User",
 *     "entityId": "...",
 *     "logs": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 25, "totalPages": 2, "hasNextPage": true, "hasPrevPage": false }
 *   }
 * }
 */
export const getAuditLogsByEntity = async (req, res) => {
  console.log("> Get audit logs by entity request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Params:", req.params);
  console.log("> Query:", req.query);

  try {
    const { entityType, entityId } = req.params;
    const { page, limit } = req.query;

    // Build filter
    const filter = {
      entityType,
      entityId,
    };

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Audit.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch logs
    const logs = await Audit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`> Found ${logs.length} audit logs for entity ${entityType}:${entityId} (total: ${total})`);

    return sendResponse(res, HTTP_STATUS.OK, "Entity audit logs fetched successfully", {
      entityType,
      entityId,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log(`Get audit logs by entity error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch entity audit logs",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/admin/audit/actor/:actorType/:actorId
 * @description Get all audit logs by a specific actor
 * @access Private (admin authenticated, requires audit.view)
 *
 * @params { actorType: "consumer" | "admin" | "system", actorId: "MongoDB ObjectId" }
 * @query { page?: number (default: 1), limit?: number (default: 20, max: 100) }
 *
 * @responseBody Success (200)
 * {
 *   "message": "Actor audit logs fetched successfully",
 *   "data": {
 *     "actorType": "admin",
 *     "actorId": "...",
 *     "logs": [...],
 *     "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3, "hasNextPage": true, "hasPrevPage": false }
 *   }
 * }
 */
export const getAuditLogsByActor = async (req, res) => {
  console.log("> Get audit logs by actor request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Params:", req.params);
  console.log("> Query:", req.query);

  try {
    const { actorType, actorId } = req.params;
    const { page, limit } = req.query;

    // Build filter
    const filter = {
      actorType,
      actorId,
    };

    // Calculate pagination
    const skip = (page - 1) * limit;
    const total = await Audit.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    // Fetch logs
    const logs = await Audit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    console.log(`> Found ${logs.length} audit logs for actor ${actorType}:${actorId} (total: ${total})`);

    return sendResponse(res, HTTP_STATUS.OK, "Actor audit logs fetched successfully", {
      actorType,
      actorId,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.log(`Get audit logs by actor error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch actor audit logs",
      null,
      error.message
    );
  }
};

export default {
  getAuditLogs,
  getAuditLogsByEntity,
  getAuditLogsByActor,
};
