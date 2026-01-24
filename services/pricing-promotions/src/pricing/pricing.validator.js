import Joi from "joi";

/**
 * Validation schema for pricing calculation (consumer and guest)
 */
export const calculatePricingSchema = Joi.object({
  cartSubtotal: Joi.number().required().min(0),
  couponCode: Joi.string().allow("", null).trim().uppercase(),
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string(),
        variantId: Joi.string().allow("", null),
        quantity: Joi.number().integer().min(1),
        price: Joi.number().min(0),
      })
    )
    .default([]),
});

export default {
  calculatePricingSchema,
};
