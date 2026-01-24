import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for assigning category to product
 * POST /api/admin/products/:productId/categories
 */
export const assignCategorySchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    categoryId: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
    isPrimary: Joi.boolean().default(false),
  }),
};

/**
 * Validation schema for bulk assigning categories
 * POST /api/admin/products/:productId/categories/bulk
 */
export const bulkAssignCategoriesSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    categories: Joi.array()
      .items(
        Joi.object({
          categoryId: objectId.required().messages({
            "string.pattern.base": "Invalid category ID format",
            "any.required": "Category ID is required",
          }),
          isPrimary: Joi.boolean().default(false),
        })
      )
      .min(1)
      .max(20)
      .required()
      .messages({
        "array.min": "At least one category is required",
        "array.max": "Cannot assign more than 20 categories at once",
        "any.required": "Categories array is required",
      }),
  }),
};

/**
 * Validation schema for product ID param
 * GET /api/admin/products/:productId/categories
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
 * Validation schema for product and category ID params
 * DELETE /api/admin/products/:productId/categories/:categoryId
 */
export const mappingParamsSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    categoryId: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
};

/**
 * Validation schema for setting primary category
 * PATCH /api/admin/products/:productId/categories/:categoryId/primary
 */
export const setPrimaryCategorySchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    categoryId: objectId.required().messages({
      "string.pattern.base": "Invalid category ID format",
      "any.required": "Category ID is required",
    }),
  }),
};

export default {
  assignCategorySchema,
  bulkAssignCategoriesSchema,
  productIdParamSchema,
  mappingParamsSchema,
  setPrimaryCategorySchema,
};
