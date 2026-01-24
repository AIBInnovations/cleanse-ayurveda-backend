import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Rule schema for smart collections
 */
const ruleSchema = Joi.object({
  field: Joi.string()
    .valid("tag", "productType", "price", "brand", "status")
    .required()
    .messages({
      "any.only": "Field must be one of: tag, productType, price, brand, status",
      "any.required": "Rule field is required",
    }),
  operator: Joi.string()
    .valid("equals", "notEquals", "contains", "greaterThan", "lessThan")
    .required()
    .messages({
      "any.only": "Operator must be one of: equals, notEquals, contains, greaterThan, lessThan",
      "any.required": "Rule operator is required",
    }),
  value: Joi.alternatives()
    .try(Joi.string(), Joi.number(), Joi.boolean(), objectId)
    .required()
    .messages({
      "any.required": "Rule value is required",
    }),
});

/**
 * Image/banner schema
 */
const imageSchema = Joi.object({
  url: Joi.string().uri().allow(null, ""),
  publicId: Joi.string().allow(null, ""),
});

/**
 * SEO schema
 */
const seoSchema = Joi.object({
  title: Joi.string().trim().max(200).allow(null, ""),
  description: Joi.string().trim().max(500).allow(null, ""),
  keywords: Joi.array().items(Joi.string().trim()).default([]),
});

/**
 * Validation schema for creating a collection
 * POST /api/admin/collections
 */
export const createCollectionSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Collection name is required",
      "string.min": "Collection name must be at least 1 character",
      "string.max": "Collection name must not exceed 200 characters",
      "any.required": "Collection name is required",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200)
      .messages({
        "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
        "string.max": "Slug must not exceed 200 characters",
      }),
    description: Joi.string().trim().max(2000).allow(null, ""),
    type: Joi.string().valid("manual", "smart").default("manual").messages({
      "any.only": "Type must be either 'manual' or 'smart'",
    }),
    rules: Joi.array().items(ruleSchema).default([]),
    rulesMatch: Joi.string().valid("all", "any").default("all").messages({
      "any.only": "Rules match must be either 'all' or 'any'",
    }),
    image: imageSchema.default({}),
    banner: imageSchema.default({}),
    seo: seoSchema.default({}),
    isFeatured: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
  }),
};

/**
 * Validation schema for updating a collection
 * PUT /api/admin/collections/:id
 */
export const updateCollectionSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Collection name cannot be empty",
      "string.min": "Collection name must be at least 1 character",
      "string.max": "Collection name must not exceed 200 characters",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200)
      .messages({
        "string.pattern.base": "Slug must contain only lowercase letters, numbers, and hyphens",
        "string.max": "Slug must not exceed 200 characters",
      }),
    description: Joi.string().trim().max(2000).allow(null, ""),
    type: Joi.string().valid("manual", "smart").messages({
      "any.only": "Type must be either 'manual' or 'smart'",
    }),
    rules: Joi.array().items(ruleSchema),
    rulesMatch: Joi.string().valid("all", "any").messages({
      "any.only": "Rules match must be either 'all' or 'any'",
    }),
    image: imageSchema,
    banner: imageSchema,
    seo: seoSchema,
    isFeatured: Joi.boolean(),
    isActive: Joi.boolean(),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for collection ID param
 * GET/DELETE /api/admin/collections/:id
 */
export const collectionIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
};

/**
 * Validation schema for collection slug param (consumer)
 * GET /api/collections/:slug
 */
export const collectionSlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Collection slug is required",
      "any.required": "Collection slug is required",
    }),
  }),
};

/**
 * Validation schema for toggling collection status
 * PATCH /api/admin/collections/:id/status
 */
export const toggleStatusSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  body: Joi.object({
    isActive: Joi.boolean().required().messages({
      "boolean.base": "isActive must be a boolean",
      "any.required": "isActive is required",
    }),
  }),
};

/**
 * Validation schema for toggling collection featured
 * PATCH /api/admin/collections/:id/featured
 */
export const toggleFeaturedSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  body: Joi.object({
    isFeatured: Joi.boolean().required().messages({
      "boolean.base": "isFeatured must be a boolean",
      "any.required": "isFeatured is required",
    }),
  }),
};

/**
 * Validation schema for adding products to collection
 * POST /api/admin/collections/:id/products
 */
export const addProductsSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  body: Joi.object({
    products: Joi.array()
      .items(
        Joi.object({
          productId: objectId.required().messages({
            "string.pattern.base": "Invalid product ID format",
            "any.required": "Product ID is required",
          }),
          sortOrder: Joi.number().integer().min(0).default(0),
        })
      )
      .min(1)
      .max(100)
      .required()
      .messages({
        "array.min": "At least one product is required",
        "array.max": "Cannot add more than 100 products at once",
        "any.required": "Products array is required",
      }),
  }),
};

/**
 * Validation schema for reordering products
 * PATCH /api/admin/collections/:id/products/reorder
 */
export const reorderProductsSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  body: Joi.object({
    products: Joi.array()
      .items(
        Joi.object({
          productId: objectId.required().messages({
            "string.pattern.base": "Invalid product ID format",
            "any.required": "Product ID is required",
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
 * Validation schema for removing product from collection
 * DELETE /api/admin/collections/:id/products/:productId
 */
export const removeProductSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
};

/**
 * Validation schema for list query (consumer)
 */
export const listCollectionsQuerySchema = {
  query: Joi.object({
    featured: Joi.boolean(),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

/**
 * Validation schema for collection products query
 */
export const collectionProductsQuerySchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Collection slug is required",
      "any.required": "Collection slug is required",
    }),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

/**
 * Validation schema for admin collection products query
 * GET /api/admin/collections/:id/products
 */
export const adminCollectionProductsQuerySchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid collection ID format",
      "any.required": "Collection ID is required",
    }),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

/**
 * Validation schema for admin list query
 */
export const adminListQuerySchema = {
  query: Joi.object({
    type: Joi.string().valid("manual", "smart"),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean(),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  createCollectionSchema,
  updateCollectionSchema,
  collectionIdParamSchema,
  collectionSlugParamSchema,
  toggleStatusSchema,
  toggleFeaturedSchema,
  addProductsSchema,
  reorderProductsSchema,
  removeProductSchema,
  listCollectionsQuerySchema,
  collectionProductsQuerySchema,
  adminCollectionProductsQuerySchema,
  adminListQuerySchema,
};
