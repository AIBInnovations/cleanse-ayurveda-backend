import { sendResponse, HTTP_STATUS } from "@shared/utils";
import NewsletterSubscriber from "../../models/newsletter-subscriber.model.js";

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// POST /newsletters/subscribe - Subscribe to newsletter
const subscribe = async (req, res) => {
  console.log("subscribe called with body:", req.body);

  const { email, popup_id, source, metadata } = req.body;

  try {
    // Check if already subscribed
    const existing = await NewsletterSubscriber.findOne({ email });

    if (existing) {
      if (existing.is_subscribed) {
        return sendResponse(
          res,
          HTTP_STATUS.OK,
          "Already subscribed",
          { email: existing.email, subscribed_at: existing.subscribed_at }
        );
      } else {
        // Resubscribe
        existing.is_subscribed = true;
        existing.unsubscribed_at = null;
        existing.popup_id = popup_id || existing.popup_id;
        existing.source = source || existing.source;
        if (metadata) {
          existing.metadata = { ...existing.metadata, ...metadata };
        }
        await existing.save();

        return sendResponse(
          res,
          HTTP_STATUS.OK,
          "Successfully resubscribed to newsletter",
          { email: existing.email, subscribed_at: existing.subscribed_at }
        );
      }
    }

    // Create new subscriber
    const subscriber = await NewsletterSubscriber.create({
      email,
      popup_id: popup_id || null,
      source: source || "footer",
      metadata: metadata || {},
    });

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Successfully subscribed to newsletter",
      { email: subscriber.email, subscribed_at: subscriber.subscribed_at }
    );
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error (race condition)
      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Already subscribed"
      );
    }
    throw error;
  }
};

// POST /newsletters/unsubscribe - Unsubscribe from newsletter
const unsubscribe = async (req, res) => {
  console.log("unsubscribe called with body:", req.body);

  const { email } = req.body;

  const subscriber = await NewsletterSubscriber.findOne({ email });

  if (!subscriber) {
    return sendResponse(
      res,
      HTTP_STATUS.NOT_FOUND,
      "Email not found in subscribers"
    );
  }

  if (!subscriber.is_subscribed) {
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Already unsubscribed"
    );
  }

  subscriber.is_subscribed = false;
  subscriber.unsubscribed_at = new Date();
  await subscriber.save();

  return sendResponse(
    res,
    HTTP_STATUS.OK,
    "Successfully unsubscribed from newsletter",
    { email: subscriber.email }
  );
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/newsletters/subscribers - List all subscribers
const listAllSubscribers = async (req, res) => {
  console.log("listAllSubscribers called with query:", req.query);

  const { page = 1, limit = 20, is_subscribed, source, search } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (typeof is_subscribed === "boolean") {
    query.is_subscribed = is_subscribed;
  }

  if (source) {
    query.source = source;
  }

  if (search) {
    query.email = { $regex: search, $options: "i" };
  }

  const [subscribers, total] = await Promise.all([
    NewsletterSubscriber.find(query)
      .sort({ subscribed_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    NewsletterSubscriber.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "Subscribers retrieved successfully", {
    subscribers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/newsletters/subscribers/:id - Get subscriber by ID
const getSubscriberById = async (req, res) => {
  console.log("getSubscriberById called with id:", req.params.id);

  const subscriber = await NewsletterSubscriber.findById(req.params.id).lean();

  if (!subscriber) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Subscriber not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Subscriber retrieved successfully", subscriber);
};

// DELETE /admin/newsletters/subscribers/:id - Delete subscriber
const deleteSubscriber = async (req, res) => {
  console.log("deleteSubscriber called with id:", req.params.id);

  const subscriber = await NewsletterSubscriber.findByIdAndDelete(req.params.id);

  if (!subscriber) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Subscriber not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Subscriber deleted successfully");
};

// GET /admin/newsletters/stats - Get newsletter statistics
const getStats = async (req, res) => {
  console.log("getStats called");

  const [totalSubscribers, activeSubscribers, unsubscribed, bySource] = await Promise.all([
    NewsletterSubscriber.countDocuments({}),
    NewsletterSubscriber.countDocuments({ is_subscribed: true }),
    NewsletterSubscriber.countDocuments({ is_subscribed: false }),
    NewsletterSubscriber.aggregate([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const stats = {
    total: totalSubscribers,
    active: activeSubscribers,
    unsubscribed,
    bySource: bySource.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {}),
  };

  return sendResponse(res, HTTP_STATUS.OK, "Newsletter stats retrieved successfully", stats);
};

export default {
  subscribe,
  unsubscribe,
  listAllSubscribers,
  getSubscriberById,
  deleteSubscriber,
  getStats,
};
