import Notification from "../../models/notification.model.js";
import NotificationTemplate from "../../models/notification-template.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/notifications
 * @description Get user's notifications (consumer)
 * @access Auth
 */
export const getNotifications = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/notifications for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: userId };

    if (req.query.isRead === "true") {
      filter.isRead = true;
    } else if (req.query.isRead === "false") {
      filter.isRead = false;
    }

    if (req.query.channel) {
      filter.channel = req.query.channel;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .select("channel content.subject content.body isRead status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${notifications.length} notifications for user ${userId}`);
    return sendResponse(res, 200, "Notifications fetched successfully", {
      notifications,
      unreadCount,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching notifications:", error.message);
    return sendResponse(res, 500, "Failed to fetch notifications", null, error.message);
  }
};

/**
 * @route PATCH /api/notifications/:id/read
 * @description Mark notification as read (consumer)
 * @access Auth
 */
export const markAsRead = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  console.log(`> PATCH /api/notifications/${id}/read`);

  try {
    const notification = await Notification.findOne({
      _id: id,
      user: userId,
    });

    if (!notification) {
      console.log(`> Notification not found: ${id}`);
      return sendResponse(res, 404, "Notification not found", null, `Notification with ID '${id}' not found`);
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    console.log(`> Notification marked as read: ${id}`);
    return sendResponse(res, 200, "Notification marked as read", { notification }, null);
  } catch (error) {
    console.log("> Error marking notification:", error.message);
    return sendResponse(res, 500, "Failed to mark notification", null, error.message);
  }
};

/**
 * @route GET /api/admin/notifications
 * @description List all notifications (admin)
 * @access Admin
 */
export const listNotifications = async (req, res) => {
  console.log("> GET /api/admin/notifications");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.channel) {
      filter.channel = req.query.channel;
    }

    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    if (req.query.templateCode) {
      filter.templateCode = req.query.templateCode.toUpperCase();
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [notifications, total, stats] = await Promise.all([
      Notification.find(filter)
        .populate("user", "firstName lastName email")
        .populate("template", "code name")
        .select("-content.body")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusStats = {
      pending: 0,
      sent: 0,
      delivered: 0,
      failed: 0,
    };

    stats.forEach((stat) => {
      statusStats[stat._id] = stat.count;
    });

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${notifications.length} of ${total} notifications`);
    return sendResponse(res, 200, "Notifications fetched successfully", {
      notifications,
      stats: statusStats,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching notifications:", error.message);
    return sendResponse(res, 500, "Failed to fetch notifications", null, error.message);
  }
};

/**
 * @route GET /api/admin/notifications/:id
 * @description Get notification details (admin)
 * @access Admin
 */
export const getNotificationById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/notifications/${id}`);

  try {
    const notification = await Notification.findById(id)
      .populate("user", "firstName lastName email phone")
      .populate("template", "code name category")
      .lean();

    if (!notification) {
      console.log(`> Notification not found: ${id}`);
      return sendResponse(res, 404, "Notification not found", null, `Notification with ID '${id}' not found`);
    }

    console.log(`> Notification found: ${id}`);
    return sendResponse(res, 200, "Notification fetched successfully", { notification }, null);
  } catch (error) {
    console.log("> Error fetching notification:", error.message);
    return sendResponse(res, 500, "Failed to fetch notification", null, error.message);
  }
};

/**
 * @route POST /api/admin/notifications/send
 * @description Send notification manually (admin)
 * @access Admin
 */
export const sendNotification = async (req, res) => {
  console.log("> POST /api/admin/notifications/send");

  try {
    const { templateCode, userId, channel, recipient, subject, body, variables } = req.body;

    let template = null;
    let finalSubject = subject;
    let finalBody = body;

    // If template code provided, get template and use its content
    if (templateCode) {
      template = await NotificationTemplate.findOne({ code: templateCode, isActive: true });
      if (!template) {
        console.log(`> Template not found: ${templateCode}`);
        return sendResponse(res, 404, "Template not found", null, `Template with code '${templateCode}' not found or inactive`);
      }

      if (!template.channels.includes(channel)) {
        console.log(`> Channel not supported by template: ${channel}`);
        return sendResponse(res, 400, "Channel not supported", null, `Template '${templateCode}' does not support channel '${channel}'`);
      }

      const channelTemplate = template.templates[channel];
      if (channelTemplate) {
        finalSubject = channelTemplate.subject || subject;
        finalBody = channelTemplate.body;

        // Replace variables
        if (variables) {
          Object.keys(variables).forEach((key) => {
            if (finalSubject) {
              finalSubject = finalSubject.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
            }
            finalBody = finalBody.replace(new RegExp(`{{${key}}}`, "g"), variables[key]);
          });
        }
      }
    }

    // Create notification record
    const notification = new Notification({
      template: template?._id || null,
      templateCode: templateCode || null,
      user: userId || null,
      channel,
      recipient,
      content: {
        subject: finalSubject || null,
        body: finalBody,
      },
      status: "pending",
    });

    await notification.save();

    // TODO: Integrate with actual notification providers (email, SMS, WhatsApp, push)
    // For now, we'll mark it as sent immediately
    notification.status = "sent";
    notification.sentAt = new Date();
    await notification.save();

    console.log(`> Notification sent: ${notification._id}`);
    return sendResponse(res, 201, "Notification sent successfully", { notification }, null);
  } catch (error) {
    console.log("> Error sending notification:", error.message);
    return sendResponse(res, 500, "Failed to send notification", null, error.message);
  }
};

/**
 * @route POST /api/admin/notifications/:id/resend
 * @description Resend failed notification (admin)
 * @access Admin
 */
export const resendNotification = async (req, res) => {
  const { id } = req.params;
  console.log(`> POST /api/admin/notifications/${id}/resend`);

  try {
    const notification = await Notification.findById(id);

    if (!notification) {
      console.log(`> Notification not found: ${id}`);
      return sendResponse(res, 404, "Notification not found", null, `Notification with ID '${id}' not found`);
    }

    if (notification.status !== "failed") {
      console.log(`> Cannot resend: status is ${notification.status}`);
      return sendResponse(res, 400, "Cannot resend", null, "Only failed notifications can be resent");
    }

    // TODO: Integrate with actual notification providers
    // For now, we'll mark it as sent immediately
    notification.status = "sent";
    notification.sentAt = new Date();
    notification.retryCount += 1;
    notification.errorMessage = null;
    await notification.save();

    console.log(`> Notification resent: ${id}`);
    return sendResponse(res, 200, "Notification resent successfully", { notification }, null);
  } catch (error) {
    console.log("> Error resending notification:", error.message);
    return sendResponse(res, 500, "Failed to resend notification", null, error.message);
  }
};

/**
 * @route GET /api/admin/notifications/stats
 * @description Get notification statistics (admin)
 * @access Admin
 */
export const getNotificationStats = async (req, res) => {
  console.log("> GET /api/admin/notifications/stats");

  try {
    const [overallStats, channelStats, dailyStats] = await Promise.all([
      Notification.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
      Notification.aggregate([
        {
          $group: {
            _id: { channel: "$channel", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]),
      Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]),
    ]);

    const stats = {
      overall: {
        pending: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        total: 0,
      },
      byChannel: {
        email: { pending: 0, sent: 0, delivered: 0, failed: 0 },
        sms: { pending: 0, sent: 0, delivered: 0, failed: 0 },
        whatsapp: { pending: 0, sent: 0, delivered: 0, failed: 0 },
        push: { pending: 0, sent: 0, delivered: 0, failed: 0 },
      },
      daily: {},
    };

    overallStats.forEach((stat) => {
      stats.overall[stat._id] = stat.count;
      stats.overall.total += stat.count;
    });

    channelStats.forEach((stat) => {
      if (stats.byChannel[stat._id.channel]) {
        stats.byChannel[stat._id.channel][stat._id.status] = stat.count;
      }
    });

    dailyStats.forEach((stat) => {
      if (!stats.daily[stat._id.date]) {
        stats.daily[stat._id.date] = { pending: 0, sent: 0, delivered: 0, failed: 0 };
      }
      stats.daily[stat._id.date][stat._id.status] = stat.count;
    });

    console.log(`> Notification stats fetched`);
    return sendResponse(res, 200, "Statistics fetched successfully", { stats }, null);
  } catch (error) {
    console.log("> Error fetching notification stats:", error.message);
    return sendResponse(res, 500, "Failed to fetch statistics", null, error.message);
  }
};

export default {
  getNotifications,
  markAsRead,
  listNotifications,
  getNotificationById,
  sendNotification,
  resendNotification,
  getNotificationStats,
};
