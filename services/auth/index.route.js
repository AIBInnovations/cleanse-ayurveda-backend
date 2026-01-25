import { Router } from "express";
import mongoose from "mongoose";
import { sendResponse } from "@shared/utils";
import { route as uploadRoutes } from "@shared/cloudinary";
import authRoutes from "./src/auth/user.route.js";
import guestRoutes from "./src/auth/guest.route.js";
import adminAuthRoutes from "./src/auth/admin.route.js";
import sessionRoutes from "./src/session/session.route.js";
import profileRoutes from "./src/profile/profile.route.js";
import addressRoutes from "./src/address/address.route.js";
import rolesRoutes from "./src/roles/roles.route.js";
import adminUsersRoutes from "./src/admin-users/admin-users.route.js";
import auditRoutes from "./src/audit/audit.route.js";
import firebaseTokenRoute from "./src/test/firebase-token.route.js";
import { firebaseAdmin } from "@shared/config";
// import logsRoutes from "./src/logs/logs.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint with database and Firebase connectivity status
 * @access Public
 *
 * @responseBody Success (200)
 * {
 *   "message": "Server is running",
 *   "data": {
 *     "status": "ok",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "services": {
 *       "database": { "status": "connected", "name": "mongodb" },
 *       "firebase": { "status": "connected", "projectId": "..." }
 *     }
 *   }
 * }
 */
router.get("/health", (req, res) => {
  // Check MongoDB connection status
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const mongoState = mongoose.connection.readyState;
  const mongoStatus = mongoState === 1 ? "connected" : mongoState === 2 ? "connecting" : "disconnected";

  // Check Firebase Admin SDK status
  let firebaseStatus = "disconnected";
  let firebaseProjectId = null;
  try {
    const app = firebaseAdmin.app();
    if (app) {
      firebaseStatus = "connected";
      firebaseProjectId = app.options.projectId || null;
    }
  } catch (error) {
    console.log(`Firebase health check error: ${error.message}`);
    firebaseStatus = "error";
  }

  const allHealthy = mongoStatus === "connected" && firebaseStatus === "connected";
  const statusCode = allHealthy ? 200 : 503;

  sendResponse(res, statusCode, "Server is running", {
    status: allHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: {
        status: mongoStatus,
        name: "mongodb",
      },
      firebase: {
        status: firebaseStatus,
        projectId: firebaseProjectId,
      },
    },
  }, null);
});

/**
 * @route /api/upload
 */
router.use("/upload", uploadRoutes);

/**
 * @route /api/* (auth routes at root level for consistency with other services)
 * Consumer authentication routes (register, login, etc.)
 * Gateway proxies /api/auth/* to /api/* in this service
 * Routes: /api/register, /api/login/otp, /api/login/password, etc.
 */
router.use("/", authRoutes);

/**
 * @route /api/guest/*
 * Guest session routes (create session, refresh, phone verification)
 * Gateway proxies /api/auth/guest/* to /api/guest/* in this service
 * Routes: /api/guest, /api/guest/refresh, /api/guest/verify-phone, etc.
 */
router.use("/guest", guestRoutes);

/**
 * @route /api/admin/* (admin auth routes at root level for consistency)
 * Admin authentication routes (login, logout, password management)
 * Gateway proxies /api/auth/admin/* to /api/admin/* in this service
 * Routes: /api/admin/login, /api/admin/logout, etc.
 */
router.use("/admin", adminAuthRoutes);

/**
 * @route /api/sessions
 * Session management routes (consumer and admin)
 */
router.use("/sessions", sessionRoutes);

/**
 * @route /api/profile
 * Profile management routes (consumer and admin customer management)
 */
router.use("/profile", profileRoutes);

/**
 * @route /api/addresses
 * Address management routes (consumer and admin)
 */
router.use("/addresses", addressRoutes);

/**
 * @route /api/admin/roles
 * Role management routes (admin only)
 */
router.use("/admin/roles", rolesRoutes);

/**
 * @route /api/admin/users
 * Admin user management routes (admin only)
 */
router.use("/admin/users", adminUsersRoutes);

/**
 * @route /api/admin/audit
 * Audit log routes (admin only)
 */
router.use("/admin/audit", auditRoutes);

/**
 * @route /api/logs
 */
// router.use("/logs", logsRoutes);

/**
 * @route /api/test/firebase-token
 * @description Firebase token generator for testing (Development only)
 * @access Public
 */
if (process.env.NODE_ENV === "development") {
  router.use("/test/firebase-token", firebaseTokenRoute);
}

export default router;
