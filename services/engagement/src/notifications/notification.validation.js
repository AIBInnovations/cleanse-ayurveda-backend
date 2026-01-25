import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for getting user's notifications
 * GET /api/notifications
 */
export const getNotificationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    isRead: Joi.string().valid("true", "false"),
    channel: Joi.string().valid("email", "sms", "whatsapp", "push"),
  }),
};

/**
 * Validation schema for marking notification as read
 * PATCH /api/notifications/:id/read
 */
export const markReadSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid notification ID format",
      "any.required": "Notification ID is required",
    }),
  }),
};

/**
 * Validation schema for listing all notifications (admin)
 * GET /api/admin/notifications
 */
export const listNotificationsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("pending", "sent", "delivered", "failed"),
    channel: Joi.string().valid("email", "sms", "whatsapp", "push"),
    userId: objectId.allow("").messages({
      "string.pattern.base": "Invalid user ID format",
    }),
    templateCode: Joi.string().trim().allow(""),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    sortBy: Joi.string().valid("createdAt", "sentAt", "status").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for notification ID param
 */
export const notificationIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid notification ID format",
      "any.required": "Notification ID is required",
    }),
  }),
};

/**
 * Validation schema for sending notification manually (admin)
 * POST /api/admin/notifications/send
 */
export const sendNotificationSchema = {
  body: Joi.object({
    templateCode: Joi.string().trim().uppercase().allow(null),
    userId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid user ID format",
    }),
    channel: Joi.string().valid("email", "sms", "whatsapp", "push").required().messages({
      "any.only": "Channel must be 'email', 'sms', 'whatsapp', or 'push'",
      "any.required": "Channel is required",
    }),
    recipient: Joi.string().trim().required().messages({
      "string.empty": "Recipient is required",
      "any.required": "Recipient is required",
    }),
    subject: Joi.string().trim().max(200).allow(null, ""),
    body: Joi.string().trim().max(5000).required().messages({
      "string.empty": "Body is required",
      "any.required": "Body is required",
    }),
    variables: Joi.object().default({}),
  }),
};

export default {
  getNotificationsSchema,
  markReadSchema,
  listNotificationsAdminSchema,
  notificationIdParamSchema,
  sendNotificationSchema,
};
