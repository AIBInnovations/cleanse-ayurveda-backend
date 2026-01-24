import Audit from "../models/audit.model.js";
import { getClientIp, getUserAgent, sanitizeForLog } from "../utils/helpers.js";

/**
 * Audit logging service for tracking all system actions
 */

/**
 * Log an action to audit trail
 * @param {object} params - Audit log parameters
 * @param {string|null} params.actorId - ID of the user/admin performing action
 * @param {string} params.actorType - Type of actor (consumer/admin/system)
 * @param {string} params.action - Action being performed
 * @param {string} params.entityType - Type of entity being acted upon
 * @param {string|null} params.entityId - ID of the entity
 * @param {object|null} params.previousState - State before action
 * @param {object|null} params.newState - State after action
 * @param {object|null} params.metadata - Additional metadata
 * @param {object|null} params.req - Express request object for IP/UA extraction
 * @returns {Promise<object>} Created audit log
 */
export const logAction = async ({
  actorId = null,
  actorType,
  action,
  entityType,
  entityId = null,
  previousState = null,
  newState = null,
  metadata = null,
  req = null,
}) => {
  try {
    let actorModel = null;
    if (actorId) {
      actorModel = actorType === "admin" ? "Admin" : "User";
    }

    const auditData = {
      actorId,
      actorModel,
      actorType,
      action,
      entityType,
      entityId,
      previousState: previousState ? sanitizeForLog(previousState) : null,
      newState: newState ? sanitizeForLog(newState) : null,
      metadata,
      ip: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    };

    const audit = await Audit.create(auditData);
    console.log(`Audit log created: ${action} on ${entityType}`);
    return audit;
  } catch (error) {
    console.log(`Failed to create audit log: ${error.message}`);
    return null;
  }
};

/**
 * Log user action
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {string} entityType - Entity type
 * @param {string|null} entityId - Entity ID
 * @param {object} req - Express request
 * @param {object|null} metadata - Additional data
 */
export const logUserAction = async (
  userId,
  action,
  entityType,
  entityId,
  req,
  metadata = null
) => {
  return logAction({
    actorId: userId,
    actorType: "consumer",
    action,
    entityType,
    entityId,
    metadata,
    req,
  });
};

/**
 * Log admin action
 * @param {string} adminId - Admin ID
 * @param {string} action - Action performed
 * @param {string} entityType - Entity type
 * @param {string|null} entityId - Entity ID
 * @param {object} req - Express request
 * @param {object|null} previousState - Previous state
 * @param {object|null} newState - New state
 * @param {object|null} metadata - Additional data
 */
export const logAdminAction = async (
  adminId,
  action,
  entityType,
  entityId,
  req,
  previousState = null,
  newState = null,
  metadata = null
) => {
  return logAction({
    actorId: adminId,
    actorType: "admin",
    action,
    entityType,
    entityId,
    previousState,
    newState,
    metadata,
    req,
  });
};

/**
 * Log system action (no actor)
 * @param {string} action - Action performed
 * @param {string} entityType - Entity type
 * @param {string|null} entityId - Entity ID
 * @param {object|null} metadata - Additional data
 */
export const logSystemAction = async (
  action,
  entityType,
  entityId = null,
  metadata = null
) => {
  return logAction({
    actorType: "system",
    action,
    entityType,
    entityId,
    metadata,
  });
};

export default {
  logAction,
  logUserAction,
  logAdminAction,
  logSystemAction,
};
