import Session from "../../models/session.model.js";
import { logUserAction, logAdminAction } from "../../services/audit.service.js";
import { sendResponse } from "@shared/utils";
import {
  HTTP_STATUS,
  AUDIT_ACTION,
  ENTITY_TYPE,
  SESSION_USER_TYPE,
  PERMISSIONS,
} from "../../utils/constants.js";

/**
 * @route GET /api/sessions
 * @description Get all active sessions for current user
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Sessions retrieved successfully",
 *   "data": {
 *     "sessions": [
 *       {
 *         "_id": "...",
 *         "deviceInfo": { "deviceType": "mobile", "os": "iOS", ... },
 *         "lastActivityAt": "2024-01-01T00:00:00.000Z",
 *         "createdAt": "2024-01-01T00:00:00.000Z",
 *         "isCurrent": true
 *       }
 *     ],
 *     "total": 1
 *   }
 * }
 */
export const getActiveSessions = async (req, res) => {
  console.log("> Get active sessions request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const sessions = await Session.find({
      userId: req.userId,
      userType: SESSION_USER_TYPE.CONSUMER,
      isActive: true,
    })
      .select("deviceInfo lastActivityAt createdAt")
      .sort({ lastActivityAt: -1 });

    const currentSessionId = req.sessionId?.toString();

    const sessionsResponse = sessions.map((session) => ({
      _id: session._id,
      deviceInfo: session.deviceInfo,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      isCurrent: session._id.toString() === currentSessionId,
    }));

    console.log(`> Found ${sessions.length} active sessions`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Sessions retrieved successfully",
      {
        sessions: sessionsResponse,
        total: sessions.length,
      },
    );
  } catch (error) {
    console.log(`Get active sessions error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve sessions",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/sessions/current
 * @description Get current session details
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Current session retrieved successfully",
 *   "data": {
 *     "session": {
 *       "_id": "...",
 *       "deviceInfo": { ... },
 *       "lastActivityAt": "...",
 *       "createdAt": "..."
 *     }
 *   }
 * }
 */
export const getCurrentSession = async (req, res) => {
  console.log("> Get current session request received");
  console.log("> User ID:", req.userId?.toString());

  try {
    const session = await Session.findOne({
      accessToken: req.accessToken,
      isActive: true,
    }).select("deviceInfo lastActivityAt createdAt");

    if (!session) {
      console.log("Current session not found");
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Session not found",
        null,
        "Current session could not be found",
      );
    }

    console.log(`> Current session: ${session._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Current session retrieved successfully",
      {
        session: {
          _id: session._id,
          deviceInfo: session.deviceInfo,
          lastActivityAt: session.lastActivityAt,
          createdAt: session.createdAt,
        },
      },
    );
  } catch (error) {
    console.log(`Get current session error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve current session",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/sessions/:sessionId
 * @description Terminate a specific session
 * @access Private (consumer authenticated)
 *
 * @param {string} sessionId - Session ID to terminate
 *
 * @responseBody Success (200)
 * { "message": "Session terminated successfully", "data": null }
 *
 * @responseBody Error (404)
 * { "message": "Session not found", "data": null, "error": "..." }
 *
 * @responseBody Error (403)
 * { "message": "Cannot terminate current session", "data": null, "error": "..." }
 */
export const terminateSession = async (req, res) => {
  console.log("> Terminate session request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Session ID to terminate:", req.params.sessionId);

  try {
    const { sessionId } = req.params;

    // Find the session
    const session = await Session.findOne({
      _id: sessionId,
      userId: req.userId,
      userType: SESSION_USER_TYPE.CONSUMER,
      isActive: true,
    });

    if (!session) {
      console.log(`Session not found or not owned by user: ${sessionId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Session not found",
        null,
        "Session not found or already terminated",
      );
    }

    // Check if trying to terminate current session
    const currentSessionId = req.sessionId?.toString();
    if (session._id.toString() === currentSessionId) {
      console.log("Cannot terminate current session via this endpoint");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot terminate current session",
        null,
        "Use logout endpoint to terminate current session",
      );
    }

    // Terminate the session
    await Session.findByIdAndUpdate(sessionId, { isActive: false });

    console.log(`Session terminated: ${sessionId}`);

    // Log audit
    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.SESSION_TERMINATED,
      ENTITY_TYPE.SESSION,
      sessionId,
      req,
      { terminatedSessionDevice: session.deviceInfo },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Session terminated successfully",
      null,
    );
  } catch (error) {
    console.log(`Terminate session error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to terminate session",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/sessions/all/others
 * @description Terminate all sessions except current
 * @access Private (consumer authenticated)
 *
 * @responseBody Success (200)
 * {
 *   "message": "All other sessions terminated successfully",
 *   "data": { "terminatedCount": 3 }
 * }
 */
export const terminateAllOtherSessions = async (req, res) => {
  console.log("> Terminate all other sessions request received");
  console.log("> User ID:", req.userId?.toString());
  console.log("> Current session ID:", req.sessionId?.toString());

  try {
    const currentSessionId = req.sessionId;

    // Terminate all sessions except current
    const result = await Session.updateMany(
      {
        userId: req.userId,
        userType: SESSION_USER_TYPE.CONSUMER,
        isActive: true,
        _id: { $ne: currentSessionId },
      },
      { isActive: false },
    );

    console.log(`Terminated ${result.modifiedCount} sessions`);

    // Log audit
    await logUserAction(
      req.userId.toString(),
      AUDIT_ACTION.ALL_SESSIONS_TERMINATED,
      ENTITY_TYPE.SESSION,
      null,
      req,
      { terminatedCount: result.modifiedCount },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "All other sessions terminated successfully",
      {
        terminatedCount: result.modifiedCount,
      },
    );
  } catch (error) {
    console.log(`Terminate all sessions error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to terminate sessions",
      null,
      error.message,
    );
  }
};

//
// ADMIN SESSION MANAGEMENT
//

/**
 * @route GET /api/sessions/admin
 * @description Get all active admin sessions
 * @access Private (admin authenticated, requires sessions.view)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Admin sessions retrieved successfully",
 *   "data": {
 *     "sessions": [
 *       {
 *         "_id": "...",
 *         "userId": { "_id": "...", "email": "admin@example.com", "firstName": "...", "lastName": "..." },
 *         "deviceInfo": { ... },
 *         "lastActivityAt": "...",
 *         "createdAt": "...",
 *         "isCurrent": false
 *       }
 *     ],
 *     "total": 5
 *   }
 * }
 */
export const getAdminActiveSessions = async (req, res) => {
  console.log("> Get admin active sessions request received");
  console.log("> Admin ID:", req.adminId?.toString());

  try {
    const sessions = await Session.find({
      userType: SESSION_USER_TYPE.ADMIN,
      isActive: true,
    })
      .populate("userId", "email firstName lastName")
      .select("userId deviceInfo lastActivityAt createdAt")
      .sort({ lastActivityAt: -1 });

    const currentSessionId = req.sessionId?.toString();

    const sessionsResponse = sessions.map((session) => ({
      _id: session._id,
      admin: session.userId,
      deviceInfo: session.deviceInfo,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      isCurrent: session._id.toString() === currentSessionId,
    }));

    console.log(`> Found ${sessions.length} active admin sessions`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Admin sessions retrieved successfully",
      {
        sessions: sessionsResponse,
        total: sessions.length,
      },
    );
  } catch (error) {
    console.log(`Get admin active sessions error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to retrieve admin sessions",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/sessions/admin/:sessionId
 * @description Force logout an admin session
 * @access Private (admin authenticated, requires sessions.manage)
 *
 * @param {string} sessionId - Session ID to terminate
 *
 * @responseBody Success (200)
 * { "message": "Admin session terminated successfully", "data": null }
 *
 * @responseBody Error (404)
 * { "message": "Session not found", "data": null, "error": "..." }
 *
 * @responseBody Error (403)
 * { "message": "Cannot terminate your own session", "data": null, "error": "..." }
 */
export const forceLogoutAdmin = async (req, res) => {
  console.log("> Force logout admin request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Session ID to terminate:", req.params.sessionId);

  try {
    const { sessionId } = req.params;

    // Find the session
    const session = await Session.findOne({
      _id: sessionId,
      userType: SESSION_USER_TYPE.ADMIN,
      isActive: true,
    }).populate("userId", "email firstName lastName");

    if (!session) {
      console.log(`Admin session not found: ${sessionId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Session not found",
        null,
        "Admin session not found or already terminated",
      );
    }

    // Check if trying to terminate own session
    const currentSessionId = req.sessionId?.toString();
    if (session._id.toString() === currentSessionId) {
      console.log("Cannot force logout own session");
      return sendResponse(
        res,
        HTTP_STATUS.FORBIDDEN,
        "Cannot terminate your own session",
        null,
        "Use logout endpoint to terminate your own session",
      );
    }

    // Terminate the session
    await Session.findByIdAndUpdate(sessionId, { isActive: false });

    console.log(`Admin session terminated: ${sessionId}`);

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.ADMIN_FORCE_LOGOUT,
      ENTITY_TYPE.SESSION,
      sessionId,
      req,
      null,
      null,
      {
        terminatedAdminId: session.userId?._id?.toString(),
        terminatedAdminEmail: session.userId?.email,
        terminatedSessionDevice: session.deviceInfo,
      },
    );

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Admin session terminated successfully",
      null,
    );
  } catch (error) {
    console.log(`Force logout admin error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to terminate admin session",
      null,
      error.message,
    );
  }
};

/**
 * @route DELETE /api/sessions/admin/all/emergency
 * @description Emergency logout all admin sessions except the super_admin making the request
 * @access Private (admin authenticated, requires sessions.emergency)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Emergency logout completed",
 *   "data": { "terminatedCount": 10 }
 * }
 */
export const forceLogoutAllAdmins = async (req, res) => {
  console.log("> Emergency logout all admins request received");
  console.log("> Admin ID:", req.adminId?.toString());
  console.log("> Current session ID:", req.sessionId?.toString());

  try {
    const currentSessionId = req.sessionId;

    // Terminate all admin sessions except current
    const result = await Session.updateMany(
      {
        userType: SESSION_USER_TYPE.ADMIN,
        isActive: true,
        _id: { $ne: currentSessionId },
      },
      { isActive: false },
    );

    console.log(
      `Emergency logout: Terminated ${result.modifiedCount} admin sessions`,
    );

    // Log audit
    await logAdminAction(
      req.adminId.toString(),
      AUDIT_ACTION.EMERGENCY_LOGOUT_ALL_ADMINS,
      ENTITY_TYPE.SESSION,
      null,
      req,
      null,
      null,
      { terminatedCount: result.modifiedCount },
    );

    return sendResponse(res, HTTP_STATUS.OK, "Emergency logout completed", {
      terminatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.log(`Emergency logout error: ${error.message}`);
    console.log(error.stack);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Emergency logout failed",
      null,
      error.message,
    );
  }
};

/**
 * @route GET /api/session/validate
 * @description Validate session for gateway authentication
 * @access Internal (called by gateway middleware)
 *
 * @header Authorization - Bearer token
 *
 * @responseBody Success (200)
 * {
 *   "message": "Session validated successfully",
 *   "data": {
 *     "isActive": true,
 *     "sessionId": "...",
 *     "userId": "...",
 *     "userType": "consumer",
 *     "userStatus": "active",
 *     "userEmail": "user@example.com",
 *     "userPhone": "+1234567890"
 *   }
 * }
 *
 * @responseBody Invalid Session (200 with isActive: false)
 * {
 *   "message": "Session is not active",
 *   "data": {
 *     "isActive": false,
 *     "reason": "Session expired" | "Session not found" | "User suspended"
 *   }
 * }
 */
export const validateSession = async (req, res) => {
  console.log("> Validate session request received");

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("> No valid authorization header provided");
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Session is not active",
        {
          isActive: false,
          reason: "No authorization token provided"
        }
      );
    }

    const token = authHeader.split(" ")[1];

    // Find session by access token
    const session = await Session.findOne({
      accessToken: token,
      isActive: true
    }).populate({
      path: "userId",
      select: "status email phone firstName lastName"
    });

    if (!session) {
      console.log("> Session not found or inactive");
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Session is not active",
        {
          isActive: false,
          reason: "Session not found"
        }
      );
    }

    // Check if session expired
    const now = new Date();
    if (session.expiresAt < now) {
      console.log("> Session expired");
      session.isActive = false;
      await session.save();

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Session is not active",
        {
          isActive: false,
          reason: "Session expired"
        }
      );
    }

    // Check user status
    const user = session.userId;
    if (user && user.status === "suspended") {
      console.log("> User is suspended");
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Session is not active",
        {
          isActive: false,
          reason: "User suspended",
          userId: user._id.toString()
        }
      );
    }

    // Update last activity timestamp
    session.lastActivityAt = now;
    await session.save();

    console.log(`> Session validated successfully: ${session._id}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Session validated successfully",
      {
        isActive: true,
        sessionId: session._id.toString(),
        userId: user?._id?.toString(),
        userType: session.userType,
        userStatus: user?.status,
        userEmail: user?.email,
        userPhone: user?.phone,
        userName: user ? `${user.firstName} ${user.lastName}`.trim() : null
      }
    );
  } catch (error) {
    console.log(`> Session validation error: ${error.message}`);
    console.log(error.stack);

    // Return inactive session on error to be safe
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Session validation failed",
      {
        isActive: false,
        reason: "Internal error during validation"
      }
    );
  }
};

export default {
  getActiveSessions,
  getCurrentSession,
  terminateSession,
  terminateAllOtherSessions,
  getAdminActiveSessions,
  forceLogoutAdmin,
  forceLogoutAllAdmins,
  validateSession,
};
