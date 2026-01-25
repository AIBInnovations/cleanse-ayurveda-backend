import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Reel from "../../models/reel.model.js";

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /reels - Get active reels
const getActiveReels = async (req, res) => {
  console.log("getActiveReels called with query:", req.query);

  const { limit = 20 } = req.query;

  const reels = await Reel.find({ is_active: true })
    .select("title description video_url thumbnail_url duration view_count")
    .sort({ sort_order: 1, created_at: -1 })
    .limit(limit)
    .lean();

  return sendResponse(res, HTTP_STATUS.OK, "Reels retrieved successfully", reels);
};

// POST /reels/:id/view - Track view count
const trackView = async (req, res) => {
  console.log("trackView called with id:", req.params.id);

  const reel = await Reel.findByIdAndUpdate(
    req.params.id,
    { $inc: { view_count: 1 } },
    { new: true }
  ).lean();

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "View tracked successfully", { view_count: reel.view_count });
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/reels - List all reels
const listAllReels = async (req, res) => {
  console.log("listAllReels called with query:", req.query);

  const { page = 1, limit = 20, is_active, search } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (search) {
    query.title = { $regex: search, $options: "i" };
  }

  const [reels, total] = await Promise.all([
    Reel.find(query)
      .populate("created_by_id", "firstName lastName")
      .sort({ sort_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Reel.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "Reels retrieved successfully", {
    reels,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/reels/:id - Get reel by ID
const getReelById = async (req, res) => {
  console.log("getReelById called with id:", req.params.id);

  const reel = await Reel.findById(req.params.id)
    .populate("created_by_id", "firstName lastName")
    .lean();

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Reel retrieved successfully", reel);
};

// POST /admin/reels - Create new reel
const createReel = async (req, res) => {
  console.log("createReel called with body:", req.body);

  const adminId = req.headers["x-admin-id"];

  const reelData = {
    ...req.body,
    created_by_id: adminId || null,
  };

  const reel = await Reel.create(reelData);

  return sendResponse(res, HTTP_STATUS.CREATED, "Reel created successfully", reel);
};

// PUT /admin/reels/:id - Update reel
const updateReel = async (req, res) => {
  console.log("updateReel called with id:", req.params.id, "body:", req.body);

  const reel = await Reel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Reel updated successfully", reel);
};

// PATCH /admin/reels/:id/activate - Activate reel
const activateReel = async (req, res) => {
  console.log("activateReel called with id:", req.params.id);

  const reel = await Reel.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Reel activated successfully", reel);
};

// PATCH /admin/reels/:id/deactivate - Deactivate reel
const deactivateReel = async (req, res) => {
  console.log("deactivateReel called with id:", req.params.id);

  const reel = await Reel.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Reel deactivated successfully", reel);
};

// PATCH /admin/reels/reorder - Reorder reels
const reorderReels = async (req, res) => {
  console.log("reorderReels called with body:", req.body);

  const { items } = req.body;

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { sort_order: item.sort_order } },
    },
  }));

  await Reel.bulkWrite(bulkOps);

  return sendResponse(res, HTTP_STATUS.OK, "Reels reordered successfully");
};

// DELETE /admin/reels/:id - Delete reel
const deleteReel = async (req, res) => {
  console.log("deleteReel called with id:", req.params.id);

  const reel = await Reel.findByIdAndDelete(req.params.id);

  if (!reel) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Reel not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Reel deleted successfully");
};

export default {
  getActiveReels,
  trackView,
  listAllReels,
  getReelById,
  createReel,
  updateReel,
  activateReel,
  deactivateReel,
  reorderReels,
  deleteReel,
};
