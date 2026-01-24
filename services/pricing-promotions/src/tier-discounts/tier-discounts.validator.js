import Joi from "joi";

/**
 * Validation schema for tier level object (subdocument)
 */
const tierLevelSchema = Joi.object({
  min: Joi.number().required().min(0),
  max: Joi.number().allow(null).min(Joi.ref("min")),
  discountType: Joi.string().required().valid("percentage", "fixed_amount"),
  discountValue: Joi.number().required().min(0),
  badge: Joi.string().allow("", null).trim().max(100),
});

/**
 * Validation schema for creating a new tier discount (admin)
 */
export const createTierDiscountSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  type: Joi.string().required().valid("cart_value", "cart_quantity"),
  levels: Joi.array()
    .items(tierLevelSchema)
    .min(1)
    .required()
    .messages({
      "array.min": "At least one tier level is required",
      "any.required": "Levels array is required",
    }),
  isActive: Joi.boolean().default(true),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso().greater(Joi.ref("startsAt")),
});

/**
 * Validation schema for updating a tier discount (admin)
 */
export const updateTierDiscountSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  type: Joi.string().valid("cart_value", "cart_quantity"),
  levels: Joi.array()
    .items(tierLevelSchema)
    .min(1)
    .messages({
      "array.min": "At least one tier level is required",
    }),
  isActive: Joi.boolean(),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso(),
}).min(1);

export default {
  createTierDiscountSchema,
  updateTierDiscountSchema,
};
