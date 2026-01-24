import Joi from "joi";

export const createInventorySchema = Joi.object({
  productId: Joi.string().required(),
  variantId: Joi.string().required(),
  sku: Joi.string().uppercase().trim().required(),
  warehouseId: Joi.string().required(),
  qtyOnHand: Joi.number().integer().min(0).default(0),
  lowStockThreshold: Joi.number().integer().min(0).default(10),
  allowBackorder: Joi.boolean().default(false),
  reorderPoint: Joi.number().integer().min(0).default(0),
  backorderLimit: Joi.number().integer().min(0).default(0),
});

export const updateQuantitySchema = Joi.object({
  qtyChange: Joi.number().integer().required(),
  reason: Joi.string().trim().required(),
});

export const setThresholdSchema = Joi.object({
  lowStockThreshold: Joi.number().integer().min(0).required(),
});

export const setReorderPointSchema = Joi.object({
  reorderPoint: Joi.number().integer().min(0).required(),
});

export const setBackorderSchema = Joi.object({
  allowBackorder: Joi.boolean().required(),
});

export const setBackorderLimitSchema = Joi.object({
  backorderLimit: Joi.number().integer().min(0).required(),
});

export const transferStockSchema = Joi.object({
  fromWarehouseId: Joi.string().required(),
  toWarehouseId: Joi.string().required(),
  variantId: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  reason: Joi.string().trim().required(),
});
