import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Logo object schema
 */
const logoSchema = Joi.object({
  url: Joi.string().uri().allow(null, ""),
  publicId: Joi.string().allow(null, ""),
});

/**
 * Validation schema for creating a brand
 * POST /api/admin/brands
 */
export const createBrandSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Brand name is required",
      "string.min": "Brand name must be at least 1 character",
      "string.max": "Brand name must not exceed 100 characters",
      "any.required": "Brand name is required",
    }),
    description: Joi.string().trim().max(500).allow(null, ""),
    logo: logoSchema.allow(null),
    isActive: Joi.boolean().default(true),
  }),
};

/**
 * Validation schema for updating a brand
 * PUT /api/admin/brands/:id
 */
export const updateBrandSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid brand ID format",
      "any.required": "Brand ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Brand name cannot be empty",
      "string.min": "Brand name must be at least 1 character",
      "string.max": "Brand name must not exceed 100 characters",
    }),
    description: Joi.string().trim().max(500).allow(null, ""),
    logo: logoSchema.allow(null),
    isActive: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for brand ID param
 * GET/DELETE /api/admin/brands/:id
 */
export const brandIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid brand ID format",
      "any.required": "Brand ID is required",
    }),
  }),
};

/**
 * Validation schema for brand slug param
 * GET /api/brands/:slug
 */
export const brandSlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Brand slug is required",
      "any.required": "Brand slug is required",
    }),
  }),
};

/**
 * Validation schema for toggling brand status
 * PATCH /api/admin/brands/:id/status
 */
export const toggleBrandStatusSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid brand ID format",
      "any.required": "Brand ID is required",
    }),
  }),
  body: Joi.object({
    isActive: Joi.boolean().required().messages({
      "any.required": "isActive field is required",
    }),
  }),
};

/**
 * Validation schema for listing brands (admin)
 * GET /api/admin/brands
 */
export const listBrandsQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow(""),
    isActive: Joi.string().valid("true", "false"),
    sortBy: Joi.string().valid("name", "createdAt").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

export default {
  createBrandSchema,
  updateBrandSchema,
  brandIdParamSchema,
  brandSlugParamSchema,
  toggleBrandStatusSchema,
  listBrandsQuerySchema,
};
