import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Faq from "../../models/faq.model.js";

// Category labels for display
const categoryLabels = {
  general: "General Questions",
  shipping: "Shipping & Delivery",
  payment: "Payment & Billing",
  returns: "Returns & Refunds",
  account: "Account & Orders",
  products: "Products & Services",
};

// Helper: Get next sort order for category
const getNextSortOrder = async (category) => {
  const maxFaq = await Faq.findOne({ category }).sort({ sort_order: -1 }).select("sort_order").lean();
  return maxFaq ? maxFaq.sort_order + 1 : 0;
};

// ============================================================
// CONSUMER CONTROLLERS
// ============================================================

// GET /faqs - Get all active FAQs
const getActiveFaqs = async (req, res) => {
  console.log("getActiveFaqs called with query:", req.query);

  const { category, search } = req.query;

  const query = { is_active: true };

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { question: { $regex: search, $options: "i" } },
      { answer: { $regex: search, $options: "i" } },
    ];
  }

  const faqs = await Faq.find(query)
    .select("question answer category sort_order")
    .sort({ category: 1, sort_order: 1 })
    .lean();

  return sendResponse(res, HTTP_STATUS.OK, "FAQs retrieved successfully", faqs);
};

// GET /faqs/categories - Get FAQ categories with counts
const getFaqCategories = async (req, res) => {
  console.log("getFaqCategories called");

  const categoryCounts = await Faq.aggregate([
    { $match: { is_active: true } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);

  const categories = categoryCounts.map(({ _id, count }) => ({
    category: _id,
    count,
    label: categoryLabels[_id] || _id,
  }));

  return sendResponse(res, HTTP_STATUS.OK, "FAQ categories retrieved successfully", categories);
};

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

// GET /admin/faqs - List all FAQs
const listAllFaqs = async (req, res) => {
  console.log("listAllFaqs called with query:", req.query);

  const { category, is_active, search, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const query = {};

  if (category) {
    query.category = category;
  }

  if (typeof is_active === "boolean") {
    query.is_active = is_active;
  }

  if (search) {
    query.question = { $regex: search, $options: "i" };
  }

  const [faqs, total] = await Promise.all([
    Faq.find(query).sort({ category: 1, sort_order: 1 }).skip(skip).limit(limit).lean(),
    Faq.countDocuments(query),
  ]);

  return sendResponse(res, HTTP_STATUS.OK, "FAQs retrieved successfully", {
    faqs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
};

// GET /admin/faqs/:id - Get FAQ by ID
const getFaqById = async (req, res) => {
  console.log("getFaqById called with id:", req.params.id);

  const faq = await Faq.findById(req.params.id).lean();

  if (!faq) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "FAQ retrieved successfully", faq);
};

// POST /admin/faqs - Create new FAQ
const createFaq = async (req, res) => {
  console.log("createFaq called with body:", req.body);

  const faqData = { ...req.body };

  // Auto-set sort_order if not provided
  if (faqData.sort_order === undefined) {
    faqData.sort_order = await getNextSortOrder(faqData.category);
  }

  const faq = await Faq.create(faqData);

  return sendResponse(res, HTTP_STATUS.CREATED, "FAQ created successfully", faq.toObject());
};

// PUT /admin/faqs/:id - Update FAQ
const updateFaq = async (req, res) => {
  console.log("updateFaq called with id:", req.params.id, "body:", req.body);

  const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).lean();

  if (!faq) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "FAQ updated successfully", faq);
};

// PATCH /admin/faqs/:id/activate - Activate FAQ
const activateFaq = async (req, res) => {
  console.log("activateFaq called with id:", req.params.id);

  const faq = await Faq.findByIdAndUpdate(
    req.params.id,
    { is_active: true },
    { new: true }
  ).lean();

  if (!faq) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "FAQ activated successfully", faq);
};

// PATCH /admin/faqs/:id/deactivate - Deactivate FAQ
const deactivateFaq = async (req, res) => {
  console.log("deactivateFaq called with id:", req.params.id);

  const faq = await Faq.findByIdAndUpdate(
    req.params.id,
    { is_active: false },
    { new: true }
  ).lean();

  if (!faq) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "FAQ deactivated successfully", faq);
};

// PATCH /admin/faqs/reorder - Bulk reorder FAQs
const reorderFaqs = async (req, res) => {
  console.log("reorderFaqs called with body:", req.body);

  const updates = req.body;

  const bulkOps = updates.map(({ id, sort_order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { sort_order },
    },
  }));

  await Faq.bulkWrite(bulkOps);

  return sendResponse(res, HTTP_STATUS.OK, "FAQs reordered successfully");
};

// DELETE /admin/faqs/:id - Delete FAQ
const deleteFaq = async (req, res) => {
  console.log("deleteFaq called with id:", req.params.id);

  const faq = await Faq.findByIdAndDelete(req.params.id);

  if (!faq) {
    return sendResponse(res, HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return sendResponse(res, HTTP_STATUS.OK, "FAQ deleted successfully");
};

export default {
  getActiveFaqs,
  getFaqCategories,
  listAllFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  activateFaq,
  deactivateFaq,
  reorderFaqs,
  deleteFaq,
};
