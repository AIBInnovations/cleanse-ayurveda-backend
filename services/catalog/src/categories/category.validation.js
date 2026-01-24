import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Image object schema
 */
const imageSchema = Joi.object({
  url: Joi.string().uri().allow(null, ""),
  publicId: Joi.string().allow(null, ""),
});

/**
 * SEO object schema
 */
const seoSchema = Joi.object({
  title: Joi.string().trim().max(100).allow(null, ""),
  description: Joi.string().trim().max(300).allow(null, ""),
  keywords: Joi.array().items(Joi.string().trim().max(50)).default([]),
});

/**
 * Validation schema for creating a category
 * POST /api/admin/categories
 */
export const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Category name is required",
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name must not exceed 100 characters",
      "any.required": "Category name is required",
    }),
    description: Joi.string().trim().max(1000).allow(null, ""),
    parent: objectId.allow(null).messages({
      "string.pattern.base": "Invalid parent category ID format",
    }),
    image: imageSchema.allow(null),
    banner: imageSchema.allow(null),
    seo: seoSchema.allow(null),
    showInMenu: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().min(0).default(0),
    isActive: Joi.boolean().default(true),
  }),
};

/**
 * Validation schema for updating a category
 * PUT /api/admin/categories/:id
 */
export const updateCategorySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Category name cannot be empty",
      "string.min": "Category name must be at least 1 character",
      "string.max": "Category name must not exceed 100 characters",
    }),
    description: Joi.string().trim().max(1000).allow(null, ""),
    parent: objectId.allow(null).messages({
      "string.pattern.base": "Invalid parent category ID format",
    }),
    image: imageSchema.allow(null),
    banner: imageSchema.allow(null),
    seo: seoSchema.allow(null),
    showInMenu: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
    isActive: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for category ID param
 * GET/DELETE /api/admin/categories/:id
 */
export const categoryIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
};

/**
 * Validation schema for category slug param
 * GET /api/categories/:slug
 */
export const categorySlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Category slug is required",
      "any.required": "Category slug is required",
    }),
  }),
};

/**
 * Validation schema for listing categories (admin)
 * GET /api/admin/categories
 */
export const listCategoriesQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow(""),
    isActive: Joi.string().valid("true", "false"),
    showInMenu: Joi.string().valid("true", "false"),
    parent: objectId.allow("null", "").messages({
      "string.pattern.base": "Invalid parent category ID format",
    }),
    level: Joi.number().integer().min(0),
    sortBy: Joi.string().valid("name", "createdAt", "sortOrder").default("sortOrder"),
    order: Joi.string().valid("asc", "desc").default("asc"),
    flat: Joi.string().valid("true", "false").default("false"),
  }),
};

/**
 * Validation schema for reordering a category
 * PATCH /api/admin/categories/:id/reorder
 */
export const reorderCategorySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
  body: Joi.object({
    sortOrder: Joi.number().integer().min(0).required().messages({
      "number.base": "Sort order must be a number",
      "number.min": "Sort order must be at least 0",
      "any.required": "Sort order is required",
    }),
  }),
};

/**
 * Validation schema for toggling category visibility
 * PATCH /api/admin/categories/:id/visibility
 */
export const toggleCategoryVisibilitySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
  body: Joi.object({
    showInMenu: Joi.boolean().required().messages({
      "boolean.base": "showInMenu must be a boolean",
      "any.required": "showInMenu is required",
    }),
  }),
};

/**
 * Validation schema for category products
 * GET /api/categories/:slug/products
 */
export const categoryProductsSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Category slug is required",
      "any.required": "Category slug is required",
    }),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid("name", "createdAt", "price").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
    includeSubcategories: Joi.string().valid("true", "false").default("true"),
  }),
};

export default {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  categorySlugParamSchema,
  listCategoriesQuerySchema,
  reorderCategorySchema,
  toggleCategoryVisibilitySchema,
  categoryProductsSchema,
};
