import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const imageSchema = Joi.object({
  url: Joi.string().uri().required(),
  publicId: Joi.string().allow(null, ""),
});

/**
 * Validation schema for creating a review
 * POST /api/products/:productId/reviews
 */
export const createReviewSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required().messages({
      "number.min": "Rating must be at least 1",
      "number.max": "Rating must not exceed 5",
      "any.required": "Rating is required",
    }),
    title: Joi.string().trim().max(200).allow(null, ""),
    content: Joi.string().trim().max(5000).allow(null, ""),
    images: Joi.array().items(imageSchema).max(5).default([]),
    orderId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid order ID format",
    }),
    orderItemId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid order item ID format",
    }),
  }),
};

/**
 * Validation schema for getting product reviews
 * GET /api/products/:productId/reviews
 */
export const getProductReviewsSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    rating: Joi.number().integer().min(1).max(5),
    sortBy: Joi.string().valid("createdAt", "rating", "helpfulCount").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for getting user's reviews
 * GET /api/my-reviews
 */
export const getMyReviewsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid("pending", "approved", "rejected"),
  }),
};

/**
 * Validation schema for admin listing reviews
 * GET /api/admin/reviews
 */
export const listReviewsAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid("pending", "approved", "rejected"),
    rating: Joi.number().integer().min(1).max(5),
    isFeatured: Joi.string().valid("true", "false"),
    isVerifiedPurchase: Joi.string().valid("true", "false"),
    productId: objectId.allow("").messages({
      "string.pattern.base": "Invalid product ID format",
    }),
    userId: objectId.allow("").messages({
      "string.pattern.base": "Invalid user ID format",
    }),
    sortBy: Joi.string().valid("createdAt", "rating", "helpfulCount", "updatedAt").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for review ID param
 */
export const reviewIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
};

/**
 * Validation schema for approving a review
 * PATCH /api/admin/reviews/:id/approve
 */
export const approveReviewSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
};

/**
 * Validation schema for rejecting a review
 * PATCH /api/admin/reviews/:id/reject
 */
export const rejectReviewSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
  body: Joi.object({
    reason: Joi.string().trim().max(500).allow(null, ""),
  }),
};

/**
 * Validation schema for toggling featured status
 * PATCH /api/admin/reviews/:id/feature
 */
export const toggleFeaturedSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
  body: Joi.object({
    isFeatured: Joi.boolean().required().messages({
      "any.required": "isFeatured is required",
    }),
  }),
};

/**
 * Validation schema for adding admin response
 * POST /api/admin/reviews/:id/respond
 */
export const adminRespondSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
  body: Joi.object({
    response: Joi.string().trim().min(1).max(2000).required().messages({
      "string.empty": "Response is required",
      "string.max": "Response must not exceed 2000 characters",
      "any.required": "Response is required",
    }),
  }),
};

export default {
  createReviewSchema,
  getProductReviewsSchema,
  getMyReviewsSchema,
  listReviewsAdminSchema,
  reviewIdParamSchema,
  approveReviewSchema,
  rejectReviewSchema,
  toggleFeaturedSchema,
  adminRespondSchema,
};
