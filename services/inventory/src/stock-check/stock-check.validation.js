import Joi from "joi";

export const checkStockSchema = Joi.object({
  warehouseId: Joi.string().allow(""),
});

export const bulkCheckSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string().required(),
        requestedQty: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
  warehouseId: Joi.string().allow(""),
});

export const validateCheckoutSchema = Joi.object({
  cartId: Joi.string().required(),
  items: Joi.array()
    .items(
      Joi.object({
        variantId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});
