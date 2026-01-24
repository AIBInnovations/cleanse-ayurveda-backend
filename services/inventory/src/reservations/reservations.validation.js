import Joi from "joi";

export const createReservationSchema = Joi.object({
  cartId: Joi.string().required(),
  variantId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  warehouseId: Joi.string().allow(""),
});

export const checkoutReservationSchema = Joi.object({
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

export const convertReservationSchema = Joi.object({
  cartId: Joi.string().required(),
  orderId: Joi.string().required(),
});

export const settingsTTLSchema = Joi.object({
  cartTTL: Joi.number().integer().min(1).required(),
  checkoutTTL: Joi.number().integer().min(1).required(),
});
