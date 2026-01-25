import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const benefitSchema = Joi.object({
  type: Joi.string().valid("discount_percent", "free_shipping", "early_access", "exclusive_products", "birthday_bonus", "custom").required(),
  value: Joi.alternatives().try(Joi.number(), Joi.string(), Joi.boolean()).allow(null),
  description: Joi.string().trim().max(500).allow(null, ""),
});

/**
 * Validation schema for creating a loyalty tier
 * POST /api/admin/loyalty/tiers
 */
export const createTierSchema = {
  body: Joi.object({
    name: Joi.string().trim().lowercase().min(1).max(50).required().messages({
      "string.empty": "Tier name is required",
      "any.required": "Tier name is required",
    }),
    displayName: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Display name is required",
      "any.required": "Display name is required",
    }),
    minPoints: Joi.number().integer().min(0).required().messages({
      "number.min": "Minimum points must be 0 or greater",
      "any.required": "Minimum points is required",
    }),
    minSpend: Joi.number().min(0).default(0),
    pointsMultiplier: Joi.number().min(1).default(1),
    benefits: Joi.array().items(benefitSchema).default([]),
    sortOrder: Joi.number().integer().default(0),
    isActive: Joi.boolean().default(true),
    color: Joi.string().trim().max(20).allow(null, ""),
    icon: Joi.string().trim().max(100).allow(null, ""),
  }),
};

/**
 * Validation schema for updating a loyalty tier
 * PUT /api/admin/loyalty/tiers/:id
 */
export const updateTierSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid tier ID format",
      "any.required": "Tier ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().lowercase().min(1).max(50),
    displayName: Joi.string().trim().min(1).max(100),
    minPoints: Joi.number().integer().min(0),
    minSpend: Joi.number().min(0),
    pointsMultiplier: Joi.number().min(1),
    benefits: Joi.array().items(benefitSchema),
    sortOrder: Joi.number().integer(),
    color: Joi.string().trim().max(20).allow(null, ""),
    icon: Joi.string().trim().max(100).allow(null, ""),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for tier ID param
 */
export const tierIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid tier ID format",
      "any.required": "Tier ID is required",
    }),
  }),
};

/**
 * Validation schema for listing tiers (admin)
 */
export const listTiersAdminSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    isActive: Joi.string().valid("true", "false"),
    sortBy: Joi.string().valid("sortOrder", "minPoints", "createdAt").default("sortOrder"),
    order: Joi.string().valid("asc", "desc").default("asc"),
  }),
};

export default {
  createTierSchema,
  updateTierSchema,
  tierIdParamSchema,
  listTiersAdminSchema,
};
