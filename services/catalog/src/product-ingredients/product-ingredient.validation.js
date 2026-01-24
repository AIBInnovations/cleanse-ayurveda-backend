import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for mapping ingredient to product
 * POST /api/admin/products/:productId/ingredients
 */
export const mapIngredientSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    ingredientId: objectId.required().messages({
      "string.pattern.base": "Invalid ingredient ID format",
      "any.required": "Ingredient ID is required",
    }),
    percentage: Joi.number().min(0).max(100).allow(null).messages({
      "number.base": "Percentage must be a number",
      "number.min": "Percentage must be at least 0",
      "number.max": "Percentage must not exceed 100",
    }),
    isKeyIngredient: Joi.boolean().default(false),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),
};

/**
 * Validation schema for updating ingredient mapping
 * PUT /api/admin/products/:productId/ingredients/:ingredientId
 */
export const updateMappingSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    ingredientId: objectId.required().messages({
      "string.pattern.base": "Invalid ingredient ID format",
      "any.required": "Ingredient ID is required",
    }),
  }),
  body: Joi.object({
    percentage: Joi.number().min(0).max(100).allow(null).messages({
      "number.base": "Percentage must be a number",
      "number.min": "Percentage must be at least 0",
      "number.max": "Percentage must not exceed 100",
    }),
    isKeyIngredient: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for product ID param
 * GET /api/admin/products/:productId/ingredients
 */
export const productIdParamSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
};

/**
 * Validation schema for product and ingredient ID params
 * DELETE /api/admin/products/:productId/ingredients/:ingredientId
 */
export const mappingParamsSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    ingredientId: objectId.required().messages({
      "string.pattern.base": "Invalid ingredient ID format",
      "any.required": "Ingredient ID is required",
    }),
  }),
};

/**
 * Validation schema for reordering product ingredients
 * PATCH /api/admin/products/:productId/ingredients/reorder
 */
export const reorderIngredientsSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    ingredients: Joi.array()
      .items(
        Joi.object({
          ingredientId: objectId.required().messages({
            "string.pattern.base": "Invalid ingredient ID format",
            "any.required": "Ingredient ID is required",
          }),
          sortOrder: Joi.number().integer().min(0).required().messages({
            "number.base": "Sort order must be a number",
            "number.min": "Sort order must be at least 0",
            "any.required": "Sort order is required",
          }),
        })
      )
      .min(1)
      .required()
      .messages({
        "array.min": "At least one ingredient is required",
        "any.required": "Ingredients array is required",
      }),
  }),
};

/**
 * Validation schema for bulk mapping ingredients
 * POST /api/admin/products/:productId/ingredients/bulk
 */
export const bulkMapIngredientsSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    ingredients: Joi.array()
      .items(
        Joi.object({
          ingredientId: objectId.required().messages({
            "string.pattern.base": "Invalid ingredient ID format",
            "any.required": "Ingredient ID is required",
          }),
          percentage: Joi.number().min(0).max(100).allow(null).messages({
            "number.base": "Percentage must be a number",
            "number.min": "Percentage must be at least 0",
            "number.max": "Percentage must not exceed 100",
          }),
          isKeyIngredient: Joi.boolean().default(false),
          sortOrder: Joi.number().integer().min(0),
        })
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one ingredient is required",
        "array.max": "Cannot map more than 50 ingredients at once",
        "any.required": "Ingredients array is required",
      }),
  }),
};

export default {
  mapIngredientSchema,
  updateMappingSchema,
  productIdParamSchema,
  mappingParamsSchema,
  reorderIngredientsSchema,
  bulkMapIngredientsSchema,
};
