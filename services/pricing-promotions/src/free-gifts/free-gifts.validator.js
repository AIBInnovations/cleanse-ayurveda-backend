import Joi from "joi";

/**
 * Validation schema for creating a new free gift rule (admin)
 */
export const createFreeGiftRuleSchema = Joi.object({
  name: Joi.string().required().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  triggerType: Joi.string().required().valid("cart_value", "product_purchase"),
  triggerValue: Joi.number()
    .when("triggerType", {
      is: "cart_value",
      then: Joi.number().required().min(0),
      otherwise: Joi.number().allow(null),
    }),
  triggerProductIds: Joi.array()
    .items(Joi.string())
    .when("triggerType", {
      is: "product_purchase",
      then: Joi.array().min(1).required(),
      otherwise: Joi.array().default([]),
    }),
  giftProductId: Joi.string().required().trim(),
  giftVariantId: Joi.string().allow("", null).trim(),
  giftQuantity: Joi.number().integer().min(1).default(1),
  isActive: Joi.boolean().default(true),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso().greater(Joi.ref("startsAt")),
});

/**
 * Validation schema for updating a free gift rule (admin)
 */
export const updateFreeGiftRuleSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().allow("", null).trim().max(1000),
  triggerType: Joi.string().valid("cart_value", "product_purchase"),
  triggerValue: Joi.number().allow(null).min(0),
  triggerProductIds: Joi.array().items(Joi.string()),
  giftProductId: Joi.string().trim(),
  giftVariantId: Joi.string().allow("", null).trim(),
  giftQuantity: Joi.number().integer().min(1),
  isActive: Joi.boolean(),
  startsAt: Joi.date().allow(null).iso(),
  endsAt: Joi.date().allow(null).iso(),
}).min(1);

export default {
  createFreeGiftRuleSchema,
  updateFreeGiftRuleSchema,
};
