import Joi from "joi";

export const restockSchema = Joi.object({
  inventoryId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().required(),
  referenceId: Joi.string().allow(""),
});

export const damageSchema = Joi.object({
  inventoryId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().required(),
});

export const correctionSchema = Joi.object({
  inventoryId: Joi.string().required(),
  qtyChange: Joi.number().integer().required(),
  reason: Joi.string().trim().required(),
});
