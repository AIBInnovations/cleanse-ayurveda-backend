import Joi from "joi";

export const createWarehouseSchema = Joi.object({
  code: Joi.string().uppercase().trim().required(),
  name: Joi.string().trim().required(),
  address: Joi.object({
    line1: Joi.string().required(),
    line2: Joi.string().allow(""),
    landmark: Joi.string().allow(""),
    city: Joi.string().required(),
    state: Joi.string().required(),
    pincode: Joi.string().required(),
    country: Joi.string().default("India"),
  }).required(),
  isActive: Joi.boolean().default(true),
  isDefault: Joi.boolean().default(false),
  priority: Joi.number().integer().min(1).default(1),
});

export const updateWarehouseSchema = Joi.object({
  name: Joi.string().trim(),
  address: Joi.object({
    line1: Joi.string(),
    line2: Joi.string().allow(""),
    landmark: Joi.string().allow(""),
    city: Joi.string(),
    state: Joi.string(),
    pincode: Joi.string(),
    country: Joi.string(),
  }),
  isActive: Joi.boolean(),
  isDefault: Joi.boolean(),
  priority: Joi.number().integer().min(1),
}).min(1);

export const statusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});
