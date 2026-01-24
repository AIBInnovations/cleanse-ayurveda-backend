import Joi from "joi";

/**
 * Validation schema for creating a new automatic discount (admin)
 */
export const createAutomaticDiscountSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  type: Joi.string().required().valid("percentage", "fixed_amount"),
  value: Joi.number().required().min(0),
  maxDiscount: Joi.number().allow(null).min(0),
  minOrderValue: Joi.number().min(0).default(0),
  appliesTo: Joi.string()
    .valid("cart", "specific_products", "specific_collections")
    .default("cart"),
  applicableIds: Joi.array().items(Joi.string()).default([]),
  priority: Joi.number().integer().min(0).default(0),
  isStackable: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso().greater(Joi.ref("startsAt")),
});

/**
 * Validation schema for updating an automatic discount (admin)
 */
export const updateAutomaticDiscountSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  type: Joi.string().valid("percentage", "fixed_amount"),
  value: Joi.number().min(0),
  maxDiscount: Joi.number().allow(null).min(0),
  minOrderValue: Joi.number().min(0),
  appliesTo: Joi.string().valid("cart", "specific_products", "specific_collections"),
  applicableIds: Joi.array().items(Joi.string()),
  priority: Joi.number().integer().min(0),
  isStackable: Joi.boolean(),
  isActive: Joi.boolean(),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso(),
}).min(1);

export default {
  createAutomaticDiscountSchema,
  updateAutomaticDiscountSchema,
};
