import Joi from "joi";

/**
 * Validation schema for coupon code validation (consumer)
 */
export const validateCouponSchema = Joi.object({
  code: Joi.string().required().trim().uppercase(),
  cartSubtotal: Joi.number().required().min(0),
});

/**
 * Validation schema for creating a new coupon (admin)
 */
export const createCouponSchema = Joi.object({
  code: Joi.string().required().trim().uppercase().min(3).max(50),
  name: Joi.string().required().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  type: Joi.string().required().valid("percentage", "fixed_amount", "free_shipping"),
  value: Joi.number().required().min(0),
  maxDiscount: Joi.number().allow(null).min(0),
  minOrderValue: Joi.number().min(0).default(0),
  usageLimitTotal: Joi.number().allow(null).min(1),
  usageLimitPerUser: Joi.number().allow(null).min(1),
  appliesTo: Joi.string().valid("all", "specific_products", "specific_collections").default("all"),
  applicableIds: Joi.array().items(Joi.string()).default([]),
  excludedIds: Joi.array().items(Joi.string()).default([]),
  customerEligibility: Joi.string().valid("all", "first_order", "specific_segments").default("all"),
  eligibleSegmentIds: Joi.array().items(Joi.string()).default([]),
  isStackable: Joi.boolean().default(false),
  isAutoApply: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso().greater(Joi.ref("startsAt")),
});

/**
 * Validation schema for updating a coupon (admin)
 */
export const updateCouponSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  value: Joi.number().min(0),
  maxDiscount: Joi.number().allow(null).min(0),
  minOrderValue: Joi.number().min(0),
  usageLimitTotal: Joi.number().allow(null).min(1),
  usageLimitPerUser: Joi.number().allow(null).min(1),
  appliesTo: Joi.string().valid("all", "specific_products", "specific_collections"),
  applicableIds: Joi.array().items(Joi.string()),
  excludedIds: Joi.array().items(Joi.string()),
  customerEligibility: Joi.string().valid("all", "first_order", "specific_segments"),
  eligibleSegmentIds: Joi.array().items(Joi.string()),
  isStackable: Joi.boolean(),
  isAutoApply: Joi.boolean(),
  isActive: Joi.boolean(),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso(),
}).min(1);

export default {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
};
