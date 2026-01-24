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
 * Validation schema for creating an ingredient
 * POST /api/admin/ingredients
 */
export const createIngredientSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Ingredient name is required",
      "string.min": "Ingredient name must be at least 1 character",
      "string.max": "Ingredient name must not exceed 100 characters",
      "any.required": "Ingredient name is required",
    }),
    description: Joi.string().trim().max(1000).allow(null, ""),
    benefits: Joi.array().items(Joi.string().trim().max(200)).default([]),
    image: imageSchema.allow(null),
    isActive: Joi.boolean().default(true),
  }),
};

/**
 * Validation schema for updating an ingredient
 * PUT /api/admin/ingredients/:id
 */
export const updateIngredientSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid ingredient ID format",
      "any.required": "Ingredient ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Ingredient name cannot be empty",
      "string.min": "Ingredient name must be at least 1 character",
      "string.max": "Ingredient name must not exceed 100 characters",
    }),
    description: Joi.string().trim().max(1000).allow(null, ""),
    benefits: Joi.array().items(Joi.string().trim().max(200)),
    image: imageSchema.allow(null),
    isActive: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for ingredient ID param
 * GET/DELETE /api/admin/ingredients/:id
 */
export const ingredientIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid ingredient ID format",
      "any.required": "Ingredient ID is required",
    }),
  }),
};

/**
 * Validation schema for ingredient slug param
 * GET /api/ingredients/:slug
 */
export const ingredientSlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Ingredient slug is required",
      "any.required": "Ingredient slug is required",
    }),
  }),
};

/**
 * Validation schema for listing ingredients (admin)
 * GET /api/admin/ingredients
 */
export const listIngredientsQuerySchema = {
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
  createIngredientSchema,
  updateIngredientSchema,
  ingredientIdParamSchema,
  ingredientSlugParamSchema,
  listIngredientsQuerySchema,
};
