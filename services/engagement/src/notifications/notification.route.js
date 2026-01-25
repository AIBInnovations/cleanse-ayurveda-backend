import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  listNotifications,
  getNotificationById,
  sendNotification,
  resendNotification,
  getNotificationStats,
} from "./notification.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  getNotificationsSchema,
  markReadSchema,
  listNotificationsAdminSchema,
  notificationIdParamSchema,
  sendNotificationSchema,
} from "./notification.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

// All consumer routes require authentication
consumerRouter.use(authenticateUser);

/**
 * @route GET /api/notifications
 * @description Get user's notifications
 * @access Auth
 */
consumerRouter.get("/", validate(getNotificationsSchema), getNotifications);

/**
 * @route PATCH /api/notifications/:id/read
 * @description Mark notification as read
 * @access Auth
 */
consumerRouter.patch("/:id/read", validate(markReadSchema), markAsRead);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/notifications
 * @description List all notifications
 * @access Admin
 */
adminRouter.get("/", validate(listNotificationsAdminSchema), listNotifications);

/**
 * @route GET /api/admin/notifications/stats
 * @description Get notification statistics
 * @access Admin
 */
adminRouter.get("/stats", getNotificationStats);

/**
 * @route POST /api/admin/notifications/send
 * @description Send notification manually
 * @access Admin
 */
adminRouter.post("/send", validate(sendNotificationSchema), sendNotification);

/**
 * @route GET /api/admin/notifications/:id
 * @description Get notification details
 * @access Admin
 */
adminRouter.get("/:id", validate(notificationIdParamSchema), getNotificationById);

/**
 * @route POST /api/admin/notifications/:id/resend
 * @description Resend failed notification
 * @access Admin
 */
adminRouter.post("/:id/resend", validate(notificationIdParamSchema), resendNotification);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
