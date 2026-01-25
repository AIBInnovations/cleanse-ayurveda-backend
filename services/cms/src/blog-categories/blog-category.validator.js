import Joi from "joi";

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Category name is required",
      "any.required": "Category name is required",
      "string.max": "Category name must not exceed 100 characters",
    }),
    slug: Joi.string().trim().lowercase().pattern(slugPattern).max(100).messages({
      "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
    parent_id: objectId.allow(null).messages({
      "string.pattern.base": "Invalid parent category ID format",
    }),
    is_active: Joi.boolean().default(true),
    sort_order: Joi.number().integer().min(0).max(9999),
  }),
};

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
      "string.max": "Category name must not exceed 100 characters",
    }),
    slug: Joi.string().trim().lowercase().pattern(slugPattern).max(100).messages({
      "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
    parent_id: objectId.allow(null).messages({
      "string.pattern.base": "Invalid parent category ID format",
    }),
    is_active: Joi.boolean(),
    sort_order: Joi.number().integer().min(0).max(9999),
  }).min(1).messages({
    "object.min": "At least one field is required for update",
  }),
};

export const getCategoryByIdSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
};

export const getCategoryBySlugSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).required().messages({
      "string.pattern.base": "Invalid slug format",
      "any.required": "Slug is required",
    }),
  }),
};

export const reorderCategoriesSchema = {
  body: Joi.object({
    items: Joi.array().items(
      Joi.object({
        id: objectId.required().messages({
          "string.pattern.base": "Invalid category ID format",
          "any.required": "Category ID is required",
        }),
        sort_order: Joi.number().integer().min(0).max(9999).required().messages({
          "any.required": "Sort order is required",
        }),
      })
    ).min(1).required().messages({
      "array.min": "At least one item is required",
      "any.required": "Items array is required",
    }),
  }),
};

export const deactivateCategorySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
  query: Joi.object({
    cascade_children: Joi.boolean().default(false),
  }),
};

export const deleteCategorySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
  query: Joi.object({
    force: Joi.boolean().default(false),
  }),
};

export const adminListQuerySchema = {
  query: Joi.object({
    is_active: Joi.boolean(),
    parent_id: Joi.string().allow("null", ""),
    search: Joi.string().trim().max(100).pattern(/^[a-zA-Z0-9\s\-_]+$/).messages({
      "string.pattern.base": "Search contains invalid characters",
    }),
    format: Joi.string().valid("flat", "tree").default("flat"),
    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
};

export default {
  createCategorySchema,
  updateCategorySchema,
  getCategoryByIdSchema,
  getCategoryBySlugSchema,
  reorderCategoriesSchema,
  deactivateCategorySchema,
  deleteCategorySchema,
  adminListQuerySchema,
};
