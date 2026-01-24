import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Valid sort options for search
 */
const sortOptions = ["relevance", "price_asc", "price_desc", "rating", "newest"];

/**
 * Validation schema for search query
 * GET /api/search
 */
export const searchQuerySchema = {
  query: Joi.object({
    q: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Search query is required",
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query must not exceed 200 characters",
      "any.required": "Search query is required",
    }),
    category: objectId.messages({
      "string.pattern.base": "Invalid category ID format",
    }),
    brand: objectId.messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    minPrice: Joi.number().min(0).messages({
      "number.base": "Minimum price must be a number",
      "number.min": "Minimum price cannot be negative",
    }),
    maxPrice: Joi.number().min(0).messages({
      "number.base": "Maximum price must be a number",
      "number.min": "Maximum price cannot be negative",
    }),
    skinType: Joi.alternatives()
      .try(
        Joi.string().valid("oily", "dry", "combination", "sensitive", "normal"),
        Joi.array().items(
          Joi.string().valid("oily", "dry", "combination", "sensitive", "normal")
        )
      )
      .messages({
        "any.only": "Invalid skin type value",
      }),
    rating: Joi.number().min(1).max(5).messages({
      "number.base": "Rating must be a number",
      "number.min": "Rating must be at least 1",
      "number.max": "Rating cannot exceed 5",
    }),
    sort: Joi.string()
      .valid(...sortOptions)
      .default("relevance")
      .messages({
        "any.only": `Sort must be one of: ${sortOptions.join(", ")}`,
      }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

/**
 * Validation schema for search suggestions
 * GET /api/search/suggestions
 */
export const suggestionsQuerySchema = {
  query: Joi.object({
    q: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Search query is required",
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query must not exceed 100 characters",
      "any.required": "Search query is required",
    }),
    limit: Joi.number().integer().min(1).max(10).default(5),
  }),
};

/**
 * Validation schema for search within category
 * GET /api/search/category/:categorySlug
 */
export const searchInCategorySchema = {
  params: Joi.object({
    categorySlug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Category slug is required",
      "any.required": "Category slug is required",
    }),
  }),
  query: Joi.object({
    q: Joi.string().trim().min(1).max(200).messages({
      "string.min": "Search query must be at least 1 character",
      "string.max": "Search query must not exceed 200 characters",
    }),
    brand: objectId.messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    minPrice: Joi.number().min(0).messages({
      "number.base": "Minimum price must be a number",
      "number.min": "Minimum price cannot be negative",
    }),
    maxPrice: Joi.number().min(0).messages({
      "number.base": "Maximum price must be a number",
      "number.min": "Maximum price cannot be negative",
    }),
    skinType: Joi.alternatives()
      .try(
        Joi.string().valid("oily", "dry", "combination", "sensitive", "normal"),
        Joi.array().items(
          Joi.string().valid("oily", "dry", "combination", "sensitive", "normal")
        )
      )
      .messages({
        "any.only": "Invalid skin type value",
      }),
    sort: Joi.string()
      .valid(...sortOptions)
      .default("relevance")
      .messages({
        "any.only": `Sort must be one of: ${sortOptions.join(", ")}`,
      }),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

/**
 * Validation schema for creating a synonym
 * POST /api/admin/search/synonyms
 */
export const createSynonymSchema = {
  body: Joi.object({
    term: Joi.string().trim().lowercase().min(1).max(100).required().messages({
      "string.empty": "Term is required",
      "string.min": "Term must be at least 1 character",
      "string.max": "Term must not exceed 100 characters",
      "any.required": "Term is required",
    }),
    synonyms: Joi.array()
      .items(Joi.string().trim().lowercase().min(1).max(100))
      .min(1)
      .max(20)
      .required()
      .messages({
        "array.min": "At least one synonym is required",
        "array.max": "Cannot have more than 20 synonyms",
        "any.required": "Synonyms array is required",
      }),
    isActive: Joi.boolean().default(true),
  }),
};

/**
 * Validation schema for updating a synonym
 * PUT /api/admin/search/synonyms/:id
 */
export const updateSynonymSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid synonym ID format",
      "any.required": "Synonym ID is required",
    }),
  }),
  body: Joi.object({
    term: Joi.string().trim().lowercase().min(1).max(100).messages({
      "string.empty": "Term cannot be empty",
      "string.min": "Term must be at least 1 character",
      "string.max": "Term must not exceed 100 characters",
    }),
    synonyms: Joi.array()
      .items(Joi.string().trim().lowercase().min(1).max(100))
      .min(1)
      .max(20)
      .messages({
        "array.min": "At least one synonym is required",
        "array.max": "Cannot have more than 20 synonyms",
      }),
    isActive: Joi.boolean(),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for synonym ID param
 * GET/DELETE /api/admin/search/synonyms/:id
 */
export const synonymIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid synonym ID format",
      "any.required": "Synonym ID is required",
    }),
  }),
};

/**
 * Validation schema for listing synonyms
 * GET /api/admin/search/synonyms
 */
export const listSynonymsQuerySchema = {
  query: Joi.object({
    isActive: Joi.boolean(),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validation schema for search analytics
 * GET /api/admin/search/analytics
 */
export const analyticsQuerySchema = {
  query: Joi.object({
    startDate: Joi.date().iso().messages({
      "date.format": "Start date must be a valid ISO date",
    }),
    endDate: Joi.date().iso().messages({
      "date.format": "End date must be a valid ISO date",
    }),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  searchQuerySchema,
  suggestionsQuerySchema,
  searchInCategorySchema,
  createSynonymSchema,
  updateSynonymSchema,
  synonymIdParamSchema,
  listSynonymsQuerySchema,
  analyticsQuerySchema,
};
