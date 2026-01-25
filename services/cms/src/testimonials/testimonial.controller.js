import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Testimonial from "../../models/testimonial.model.js";

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /testimonials - Get active testimonials
const getActiveTestimonials = async (req, res) => {
  console.log("getActiveTestimonials called with query:", req.query);

  const { limit = 20 } = req.query;

  const testimonials = await Testimonial.find({ is_active: true })
    .select("customer_name customer_photo_url testimonial_text rating before_photo_url after_photo_url is_verified_purchase is_featured")
    .sort({ sort_order: 1, created_at: -1 })
    .limit(limit)
    .lean();

  return sendResponse(res, HTTP_STATUS.OK, "Testimonials retrieved successfully", testimonials);
};

// GET /testimonials/featured - Get featured testimonials
const getFeaturedTestimonials = async (req, res) => {
  console.log("getFeaturedTestimonials called");

  const testimonials = await Testimonial.find({ is_active: true, is_featured: true })
    .select("customer_name customer_photo_url testimonial_text rating before_photo_url after_photo_url is_verified_purchase")
    .sort({ sort_order: 1, created_at: -1 })
    .lean();

  return sendResponse(res, HTTP_STATUS.OK, "Featured testimonials retrieved successfully", testimonials);
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/testimonials - List all testimonials
const listAllTestimonials = async (req, res) => {
  console.log("listAllTestimonials called with query:", req.query);

  const { page = 1, limit = 20, is_active, is_featured, search } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (typeof is_featured === "boolean") {
    query.is_featured = is_featured;
  }

  if (search) {
    query.customer_name = { $regex: search, $options: "i" };
  }

  const [testimonials, total] = await Promise.all([
    Testimonial.find(query)
      .populate("created_by_id", "firstName lastName")
      .sort({ sort_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Testimonial.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "Testimonials retrieved successfully", {
    testimonials,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/testimonials/:id - Get testimonial by ID
const getTestimonialById = async (req, res) => {
  console.log("getTestimonialById called with id:", req.params.id);

  const testimonial = await Testimonial.findById(req.params.id)
    .populate("created_by_id", "firstName lastName")
    .lean();

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial retrieved successfully", testimonial);
};

// POST /admin/testimonials - Create new testimonial
const createTestimonial = async (req, res) => {
  console.log("createTestimonial called with body:", req.body);

  const adminId = req.headers["x-admin-id"];

  const testimonialData = {
    ...req.body,
    created_by_id: adminId || null,
  };

  const testimonial = await Testimonial.create(testimonialData);

  return sendResponse(res, HTTP_STATUS.CREATED, "Testimonial created successfully", testimonial);
};

// PUT /admin/testimonials/:id - Update testimonial
const updateTestimonial = async (req, res) => {
  console.log("updateTestimonial called with id:", req.params.id, "body:", req.body);

  const testimonial = await Testimonial.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial updated successfully", testimonial);
};

// PATCH /admin/testimonials/:id/activate - Activate testimonial
const activateTestimonial = async (req, res) => {
  console.log("activateTestimonial called with id:", req.params.id);

  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial activated successfully", testimonial);
};

// PATCH /admin/testimonials/:id/deactivate - Deactivate testimonial
const deactivateTestimonial = async (req, res) => {
  console.log("deactivateTestimonial called with id:", req.params.id);

  const testimonial = await Testimonial.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial deactivated successfully", testimonial);
};

// PATCH /admin/testimonials/:id/feature - Toggle featured status
const toggleFeatured = async (req, res) => {
  console.log("toggleFeatured called with id:", req.params.id);

  const testimonial = await Testimonial.findById(req.params.id);

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  testimonial.is_featured = !testimonial.is_featured;
  await testimonial.save();

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial featured status updated successfully", testimonial);
};

// PATCH /admin/testimonials/reorder - Reorder testimonials
const reorderTestimonials = async (req, res) => {
  console.log("reorderTestimonials called with body:", req.body);

  const { items } = req.body;

  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { sort_order: item.sort_order } },
    },
  }));

  await Testimonial.bulkWrite(bulkOps);

  return sendResponse(res, HTTP_STATUS.OK, "Testimonials reordered successfully");
};

// DELETE /admin/testimonials/:id - Delete testimonial
const deleteTestimonial = async (req, res) => {
  console.log("deleteTestimonial called with id:", req.params.id);

  const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

  if (!testimonial) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "Testimonial not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "Testimonial deleted successfully");
};

export default {
  getActiveTestimonials,
  getFeaturedTestimonials,
  listAllTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  activateTestimonial,
  deactivateTestimonial,
  toggleFeatured,
  reorderTestimonials,
  deleteTestimonial,
};
