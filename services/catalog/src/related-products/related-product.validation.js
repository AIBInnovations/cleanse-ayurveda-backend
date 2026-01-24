import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Valid relation types
 */
const relationTypes = ["crossSell", "upSell", "frequentlyBoughtTogether"];

/**
 * Validation schema for product slug param (consumer)
 * GET /api/products/:productSlug/cross-sell, /up-sell, /frequently-bought
 */
export const productSlugParamSchema = {
  params: Joi.object({
    productSlug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
};

/**
 * Validation schema for product ID param (admin)
 * GET /api/admin/products/:productId/related
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
 * Validation schema for listing related products query
 */
export const listRelatedQuerySchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  query: Joi.object({
    relationType: Joi.string().valid(...relationTypes).messages({
      "any.only": `Relation type must be one of: ${relationTypes.join(", ")}`,
    }),
  }),
};

/**
 * Validation schema for adding related product
 * POST /api/admin/products/:productId/related
 */
export const addRelatedSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    relatedProductId: objectId.required().messages({
      "string.pattern.base": "Invalid related product ID format",
      "any.required": "Related product ID is required",
    }),
    relationType: Joi.string()
      .valid(...relationTypes)
      .required()
      .messages({
        "any.only": `Relation type must be one of: ${relationTypes.join(", ")}`,
        "any.required": "Relation type is required",
      }),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),
};

/**
 * Validation schema for bulk adding related products
 * POST /api/admin/products/:productId/related/bulk
 */
export const bulkAddRelatedSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    products: Joi.array()
      .items(
        Joi.object({
          relatedProductId: objectId.required().messages({
            "string.pattern.base": "Invalid related product ID format",
            "any.required": "Related product ID is required",
          }),
          relationType: Joi.string()
            .valid(...relationTypes)
            .required()
            .messages({
              "any.only": `Relation type must be one of: ${relationTypes.join(", ")}`,
              "any.required": "Relation type is required",
            }),
          sortOrder: Joi.number().integer().min(0).default(0),
        })
      )
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one product is required",
        "array.max": "Cannot add more than 50 products at once",
        "any.required": "Products array is required",
      }),
  }),
};

/**
 * Validation schema for reordering related products
 * PATCH /api/admin/products/:productId/related/reorder
 */
export const reorderRelatedSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    relationType: Joi.string()
      .valid(...relationTypes)
      .required()
      .messages({
        "any.only": `Relation type must be one of: ${relationTypes.join(", ")}`,
        "any.required": "Relation type is required",
      }),
    products: Joi.array()
      .items(
        Joi.object({
          relatedProductId: objectId.required().messages({
            "string.pattern.base": "Invalid related product ID format",
            "any.required": "Related product ID is required",
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
        "array.min": "At least one product is required",
        "any.required": "Products array is required",
      }),
  }),
};

/**
 * Validation schema for removing related product
 * DELETE /api/admin/products/:productId/related/:relatedId
 */
export const removeRelatedSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    relatedId: objectId.required().messages({
      "string.pattern.base": "Invalid related product ID format",
      "any.required": "Related product ID is required",
    }),
  }),
  query: Joi.object({
    relationType: Joi.string()
      .valid(...relationTypes)
      .messages({
        "any.only": `Relation type must be one of: ${relationTypes.join(", ")}`,
      }),
  }),
};

/**
 * Validation schema for consumer related query
 */
export const consumerRelatedQuerySchema = {
  params: Joi.object({
    productSlug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10),
  }),
};

export default {
  productSlugParamSchema,
  productIdParamSchema,
  listRelatedQuerySchema,
  addRelatedSchema,
  bulkAddRelatedSchema,
  reorderRelatedSchema,
  removeRelatedSchema,
  consumerRelatedQuerySchema,
};
