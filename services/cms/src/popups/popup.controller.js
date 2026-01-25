import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Popup from "../../models/popup.model.js";
import NewsletterSubscriber from "../../models/newsletter-subscriber.model.js";

// Helper: Compute popup status based on dates and is_active
const computePopupStatus = (popup) => {
  if (!popup.is_active) return "inactive";

  const now = new Date();
  if (popup.starts_at && new Date(popup.starts_at) > now) return "scheduled";
  if (popup.ends_at && new Date(popup.ends_at) < now) return "expired";

  return "active";
};

// Helper: Check if popup matches target page pattern
const matchesTargetPage = (targetPages, currentPage) => {
  if (!targetPages || targetPages.length === 0) return true;
  if (!currentPage) return true;

  return targetPages.some((pattern) => {
    if (pattern === currentPage) return true;
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      return currentPage.startsWith(prefix);
    }
    return false;
  });
};

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /popups - Get active popups for current page
const getActivePopups = async (req, res) => {
  console.log("getActivePopups called with query:", req.query);

  const { target_page, type } = req.query;
  const now = new Date();

  const query = {
    is_active: true,
    $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
    $and: [{ $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }],
  };

  if (type) {
    query.type = type;
  }

  const popups = await Popup.find(query)
    .select("type title content image_url cta_text cta_url trigger_type trigger_value frequency target_pages")
    .sort({ created_at: -1 })
    .lean();

  // Filter by target_page if provided
  const filteredPopups = target_page
    ? popups.filter((popup) => matchesTargetPage(popup.target_pages, target_page))
    : popups;

  // Remove target_pages from response
  const result = filteredPopups.map(({ target_pages, ...rest }) => rest);

  return sendResponse(res, HTTP_STATUS.OK, "Popups retrieved successfully", result);
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/popups - List all popups
const listAllPopups = async (req, res) => {
  console.log("listAllPopups called with query:", req.query);

  const { type, is_active, status, search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (type) {
    query.type = type;
  }

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const [popups, total] = await Promise.all([
    Popup.find(query).sort({ created_at: -1 }).skip(skip).limit(limit).lean(),
    Popup.countDocuments(query),
  ]);

  // Add computed status and filter by status if provided
  let popupsWithStatus = popups.map((popup) => ({
    ...popup,
    status: computePopupStatus(popup),
  }));

  if (status) {
    popupsWithStatus = popupsWithStatus.filter((popup) => popup.status === status);
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popups retrieved successfully", {
    popups: popupsWithStatus,
    pagination: {
      page,
      limit,
      total: status ? popupsWithStatus.length : total,
      pages: Math.ceil((status ? popupsWithStatus.length : total) / limit),
    },
  });
};

// GET /admin/popups/:id - Get popup by ID
const getPopupById = async (req, res) => {
  console.log("getPopupById called with id:", req.params.id);

  const popup = await Popup.findById(req.params.id).lean();

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popup retrieved successfully", {
    ...popup,
    status: computePopupStatus(popup),
  });
};

// POST /admin/popups - Create new popup
const createPopup = async (req, res) => {
  console.log("createPopup called with body:", req.body);

  const adminId = req.headers["x-admin-id"];

  const popupData = {
    ...req.body,
    created_by_id: adminId || null,
  };

  const popup = await Popup.create(popupData);

  return sendResponse(res, HTTP_STATUS.CREATED, "Popup created successfully", {
    ...popup.toObject(),
    status: computePopupStatus(popup),
  });
};

// PUT /admin/popups/:id - Update popup
const updatePopup = async (req, res) => {
  console.log("updatePopup called with id:", req.params.id, "body:", req.body);

  const popup = await Popup.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popup updated successfully", {
    ...popup,
    status: computePopupStatus(popup),
  });
};

// PATCH /admin/popups/:id/activate - Activate popup
const activatePopup = async (req, res) => {
  console.log("activatePopup called with id:", req.params.id);

  const popup = await Popup.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popup activated successfully", {
    ...popup,
    status: computePopupStatus(popup),
  });
};

// PATCH /admin/popups/:id/deactivate - Deactivate popup
const deactivatePopup = async (req, res) => {
  console.log("deactivatePopup called with id:", req.params.id);

  const popup = await Popup.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popup deactivated successfully", {
    ...popup,
    status: computePopupStatus(popup),
  });
};

// DELETE /admin/popups/:id - Delete popup
const deletePopup = async (req, res) => {
  console.log("deletePopup called with id:", req.params.id);

  const popup = await Popup.findByIdAndDelete(req.params.id);

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Popup deleted successfully");
};

/**
 * @route POST /popups/:id/subscribe
 * @description Subscribe to newsletter via popup
 * @access Public
 *
 * @params
 * - id: Popup ObjectId
 *
 * @requestBody
 * {
 *   "email": "user@example.com",
 *   "page_url": "https://example.com/page" (optional)
 * }
 *
 * @responseBody Success (201)
 * {
 *   "message": "Successfully subscribed to newsletter",
 *   "data": { "email": "user@example.com" }
 * }
 */
const subscribeNewsletter = async (req, res) => {
  console.log("subscribeNewsletter called with id:", req.params.id, "body:", req.body);

  const { id } = req.params;
  const { email, page_url } = req.body;

  const popup = await Popup.findById(id);

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  if (popup.type !== "newsletter") {
    return sendResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      "Invalid popup type",
      null,
      "This popup does not accept newsletter subscriptions"
    );
  }

  // Check if email already subscribed
  const existingSubscriber = await NewsletterSubscriber.findOne({ email: email.toLowerCase() });

  if (existingSubscriber) {
    // If unsubscribed, re-subscribe
    if (!existingSubscriber.is_subscribed) {
      existingSubscriber.is_subscribed = true;
      existingSubscriber.unsubscribed_at = null;
      existingSubscriber.popup_id = id;
      await existingSubscriber.save();

      // Increment submissions stat
      await Popup.findByIdAndUpdate(id, { $inc: { "stats.submissions": 1 } });

      return sendResponse(res, HTTP_STATUS.OK, "Successfully re-subscribed to newsletter", {
        email: existingSubscriber.email,
      });
    }

    return sendResponse(res, HTTP_STATUS.OK, "Email already subscribed", {
      email: existingSubscriber.email,
    });
  }

  // Create new subscriber
  const subscriber = await NewsletterSubscriber.create({
    email,
    popup_id: id,
    source: "popup",
    metadata: {
      user_agent: req.headers["user-agent"] || null,
      ip_address: req.ip || req.headers["x-forwarded-for"] || null,
      page_url: page_url || null,
    },
  });

  // Increment submissions stat using atomic operation
  await Popup.findByIdAndUpdate(id, { $inc: { "stats.submissions": 1 } });

  return sendResponse(res, HTTP_STATUS.CREATED, "Successfully subscribed to newsletter", {
    email: subscriber.email,
  });
};

/**
 * @route POST /popups/:id/impression
 * @description Track popup impression
 * @access Public
 *
 * @params
 * - id: Popup ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Impression tracked"
 * }
 */
const trackImpression = async (req, res) => {
  console.log("trackImpression called with id:", req.params.id);

  const { id } = req.params;

  const popup = await Popup.findByIdAndUpdate(
    id,
    { $inc: { "stats.impressions": 1 } },
    { new: true }
  );

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Impression tracked");
};

/**
 * @route POST /popups/:id/click
 * @description Track popup CTA click
 * @access Public
 *
 * @params
 * - id: Popup ObjectId
 *
 * @responseBody Success (200)
 * {
 *   "message": "Click tracked"
 * }
 */
const trackClick = async (req, res) => {
  console.log("trackClick called with id:", req.params.id);

  const { id } = req.params;

  const popup = await Popup.findByIdAndUpdate(
    id,
    { $inc: { "stats.clicks": 1 } },
    { new: true }
  );

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Click tracked");
};

/**
 * @route GET /admin/popups/:id/stats
 * @description Get popup conversion statistics
 * @access Admin
 *
 * @params
 * - id: Popup ObjectId
 *
 * @query
 * - from_date: ISO date (optional)
 * - to_date: ISO date (optional)
 *
 * @responseBody Success (200)
 * {
 *   "message": "Popup stats retrieved successfully",
 *   "data": {
 *     "popup_id": "...",
 *     "name": "Newsletter Popup",
 *     "type": "newsletter",
 *     "stats": {
 *       "impressions": 1000,
 *       "clicks": 150,
 *       "submissions": 75,
 *       "click_rate": 15.0,
 *       "conversion_rate": 7.5
 *     }
 *   }
 * }
 */
const getPopupStats = async (req, res) => {
  console.log("getPopupStats called with id:", req.params.id);

  const { id } = req.params;

  const popup = await Popup.findById(id).select("name type stats").lean();

  if (!popup) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Popup not found");
  }

  const { impressions = 0, clicks = 0, submissions = 0 } = popup.stats || {};

  const clickRate = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : 0;
  const conversionRate = impressions > 0 ? ((submissions / impressions) * 100).toFixed(2) : 0;

  return sendResponse(res, HTTP_STATUS.OK, "Popup stats retrieved successfully", {
    popup_id: popup._id,
    name: popup.name,
    type: popup.type,
    stats: {
      impressions,
      clicks,
      submissions,
      click_rate: parseFloat(clickRate),
      conversion_rate: parseFloat(conversionRate),
    },
  });
};

export default {
  getActivePopups,
  listAllPopups,
  getPopupById,
  createPopup,
  updatePopup,
  activatePopup,
  deactivatePopup,
  deletePopup,
  subscribeNewsletter,
  trackImpression,
  trackClick,
  getPopupStats,
};
