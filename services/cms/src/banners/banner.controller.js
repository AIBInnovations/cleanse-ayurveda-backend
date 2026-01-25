import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Banner from "../../models/banner.model.js";

// Helper: Compute banner status based on dates and is_active
const computeBannerStatus = (banner) => {
  if (!banner.is_active) return "inactive";

  const now = new Date();
  if (banner.starts_at && new Date(banner.starts_at) > now) return "scheduled";
  if (banner.ends_at && new Date(banner.ends_at) < now) return "expired";

  return "active";
};

// Helper: Check if banner matches target page pattern
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

// GET /banners - Get active banners
const getActiveBanners = async (req, res) => {
  console.log("getActiveBanners called with query:", req.query);

  const { placement, target_page } = req.query;
  const now = new Date();

  const query = {
    is_active: true,
    $or: [{ starts_at: null }, { starts_at: { $lte: now } }],
    $and: [{ $or: [{ ends_at: null }, { ends_at: { $gte: now } }] }],
  };

  if (placement) {
    query.placement = placement;
  }

  const banners = await Banner.find(query)
    .select("title subtitle cta_text cta_url image_desktop_url image_mobile_url placement target_pages")
    .sort({ priority: 1 })
    .lean();

  // Filter by target_page if provided
  const filteredBanners = target_page
    ? banners.filter((banner) => matchesTargetPage(banner.target_pages, target_page))
    : banners;

  // Remove target_pages from response
  const result = filteredBanners.map(({ target_pages, ...rest }) => rest);

  return sendResponse(res, HTTP_STATUS.OK, "Banners retrieved successfully", result);
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/banners - List all banners
const listAllBanners = async (req, res) => {
  console.log("listAllBanners called with query:", req.query);

  const { placement, is_active, status, search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (placement) {
    query.placement = placement;
  }

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const [banners, total] = await Promise.all([
    Banner.find(query).sort({ priority: 1, created_at: -1 }).skip(skip).limit(limit).lean(),
    Banner.countDocuments(query),
  ]);

  // Add computed status and filter by status if provided
  let bannersWithStatus = banners.map((banner) => ({
    ...banner,
    status: computeBannerStatus(banner),
  }));

  if (status) {
    bannersWithStatus = bannersWithStatus.filter((banner) => banner.status === status);
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banners retrieved successfully", {
    banners: bannersWithStatus,
    pagination: {
      page,
      limit,
      total: status ? bannersWithStatus.length : total,
      pages: Math.ceil((status ? bannersWithStatus.length : total) / limit),
    },
  });
};

// GET /admin/banners/:id - Get banner by ID
const getBannerById = async (req, res) => {
  console.log("getBannerById called with id:", req.params.id);

  const banner = await Banner.findById(req.params.id).lean();

  if (!banner) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Banner not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banner retrieved successfully", {
    ...banner,
    status: computeBannerStatus(banner),
  });
};

// POST /admin/banners - Create new banner
const createBanner = async (req, res) => {
  console.log("createBanner called with body:", req.body);

  const adminId = req.headers["x-admin-id"];

  const bannerData = {
    ...req.body,
    created_by_id: adminId || null,
  };

  const banner = await Banner.create(bannerData);

  return sendResponse(res, HTTP_STATUS.CREATED, "Banner created successfully", {
    ...banner.toObject(),
    status: computeBannerStatus(banner),
  });
};

// PUT /admin/banners/:id - Update banner
const updateBanner = async (req, res) => {
  console.log("updateBanner called with id:", req.params.id, "body:", req.body);

  const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!banner) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Banner not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banner updated successfully", {
    ...banner,
    status: computeBannerStatus(banner),
  });
};

// PATCH /admin/banners/:id/activate - Activate banner
const activateBanner = async (req, res) => {
  console.log("activateBanner called with id:", req.params.id);

  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!banner) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Banner not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banner activated successfully", {
    ...banner,
    status: computeBannerStatus(banner),
  });
};

// PATCH /admin/banners/:id/deactivate - Deactivate banner
const deactivateBanner = async (req, res) => {
  console.log("deactivateBanner called with id:", req.params.id);

  const banner = await Banner.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!banner) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Banner not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banner deactivated successfully", {
    ...banner,
    status: computeBannerStatus(banner),
  });
};

// PATCH /admin/banners/reorder - Reorder banners by priority
const reorderBanners = async (req, res) => {
  console.log("reorderBanners called with body:", req.body);

  const updates = req.body;

  const bulkOps = updates.map(({ id, priority }) => ({
    updateOne: {
      filter: { _id: id },
      update: { priority },
    },
  }));

  await Banner.bulkWrite(bulkOps);

  return sendResponse(res, HTTP_STATUS.OK, "Banners reordered successfully");
};

// DELETE /admin/banners/:id - Delete banner
const deleteBanner = async (req, res) => {
  console.log("deleteBanner called with id:", req.params.id);

  const banner = await Banner.findByIdAndDelete(req.params.id);

  if (!banner) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Banner not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Banner deleted successfully");
};

export default {
  getActiveBanners,
  listAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  activateBanner,
  deactivateBanner,
  reorderBanners,
  deleteBanner,
};
