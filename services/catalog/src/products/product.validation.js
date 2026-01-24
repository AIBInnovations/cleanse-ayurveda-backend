import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * SEO object schema
 */
const seoSchema = Joi.object({
  title: Joi.string().trim().max(100).allow(null, ""),
  description: Joi.string().trim().max(300).allow(null, ""),
  keywords: Joi.array().items(Joi.string().trim().max(50)).default([]),
});

/**
 * Attributes object schema
 */
const attributesSchema = Joi.object({
  skinType: Joi.array()
    .items(Joi.string().valid("oily", "dry", "combination", "sensitive", "normal"))
    .default([]),
  concerns: Joi.array().items(Joi.string().trim().max(100)).default([]),
});

/**
 * Validation schema for creating a product
 * POST /api/admin/products
 */
export const createProductSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Product name is required",
      "string.min": "Product name must be at least 1 character",
      "string.max": "Product name must not exceed 200 characters",
      "any.required": "Product name is required",
    }),
    slug: Joi.string().trim().lowercase().min(1).max(200).required().messages({
      "string.empty": "Product slug is required",
      "string.min": "Product slug must be at least 1 character",
      "string.max": "Product slug must not exceed 200 characters",
      "any.required": "Product slug is required",
    }),
    sku: Joi.string().trim().uppercase().min(1).max(100).required().messages({
      "string.empty": "Product SKU is required",
      "string.min": "Product SKU must be at least 1 character",
      "string.max": "Product SKU must not exceed 100 characters",
      "any.required": "Product SKU is required",
    }),
    description: Joi.string().trim().max(5000).allow(null, ""),
    shortDescription: Joi.string().trim().max(500).allow(null, ""),
    benefits: Joi.array().items(Joi.string().trim().max(200)).default([]),
    howToUse: Joi.string().trim().max(2000).allow(null, ""),
    brand: objectId.allow(null).messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    productType: Joi.string().valid("simple", "variable").default("simple"),
    status: Joi.string().valid("draft", "active", "archived").default("draft"),
    isFeatured: Joi.boolean().default(false),
    isBestseller: Joi.boolean().default(false),
    isNewArrival: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().trim().max(50)).default([]),
    attributes: attributesSchema.default({ skinType: [], concerns: [] }),
    seo: seoSchema.allow(null),
    hsnCode: Joi.string().trim().max(20).allow(null, ""),
  }),
};

/**
 * Validation schema for updating a product
 * PUT /api/admin/products/:id
 */
export const updateProductSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Product name cannot be empty",
      "string.min": "Product name must be at least 1 character",
      "string.max": "Product name must not exceed 200 characters",
    }),
    description: Joi.string().trim().max(5000).allow(null, ""),
    shortDescription: Joi.string().trim().max(500).allow(null, ""),
    benefits: Joi.array().items(Joi.string().trim().max(200)),
    howToUse: Joi.string().trim().max(2000).allow(null, ""),
    brand: objectId.allow(null).messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    productType: Joi.string().valid("simple", "variable"),
    status: Joi.string().valid("draft", "active", "archived"),
    isFeatured: Joi.boolean(),
    isBestseller: Joi.boolean(),
    isNewArrival: Joi.boolean(),
    tags: Joi.array().items(Joi.string().trim().max(50)),
    attributes: attributesSchema,
    seo: seoSchema.allow(null),
    hsnCode: Joi.string().trim().max(20).allow(null, ""),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for product ID param
 * GET/DELETE /api/admin/products/:id
 */
export const productIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
};

/**
 * Validation schema for product slug param
 * GET /api/products/:slug
 */
export const productSlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
};

/**
 * Validation schema for listing products (consumer)
 * GET /api/products
 */
export const listProductsQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().trim().allow(""),
    category: Joi.string().trim().allow(""),
    brand: objectId.allow("").messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    skinType: Joi.alternatives().try(
      Joi.string().valid("oily", "dry", "combination", "sensitive", "normal"),
      Joi.array().items(Joi.string().valid("oily", "dry", "combination", "sensitive", "normal"))
    ),
    concerns: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    ),
    tags: Joi.alternatives().try(
      Joi.string().trim(),
      Joi.array().items(Joi.string().trim())
    ),
    isFeatured: Joi.string().valid("true", "false"),
    isBestseller: Joi.string().valid("true", "false"),
    isNewArrival: Joi.string().valid("true", "false"),
    sortBy: Joi.string().valid("name", "createdAt", "price").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for listing products (admin)
 * GET /api/admin/products
 */
export const listProductsAdminQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().trim().allow(""),
    status: Joi.string().valid("draft", "active", "archived"),
    productType: Joi.string().valid("simple", "variable"),
    brand: objectId.allow("").messages({
      "string.pattern.base": "Invalid brand ID format",
    }),
    category: Joi.string().trim().allow(""),
    isFeatured: Joi.string().valid("true", "false"),
    isBestseller: Joi.string().valid("true", "false"),
    isNewArrival: Joi.string().valid("true", "false"),
    sortBy: Joi.string().valid("name", "createdAt", "updatedAt", "status").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
};

/**
 * Validation schema for updating product status
 * PATCH /api/admin/products/:id/status
 */
export const updateProductStatusSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    status: Joi.string().valid("draft", "active", "archived").required().messages({
      "any.only": "Status must be one of: draft, active, archived",
      "any.required": "Status is required",
    }),
  }),
};

/**
 * Validation schema for updating product flags
 * PATCH /api/admin/products/:id/flags
 */
export const updateProductFlagsSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    isFeatured: Joi.boolean(),
    isBestseller: Joi.boolean(),
    isNewArrival: Joi.boolean(),
  }).min(1).messages({
    "object.min": "At least one flag is required to update",
  }),
};

/**
 * Validation schema for duplicating a product
 * POST /api/admin/products/:id/duplicate
 */
export const duplicateProductSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Product name cannot be empty",
      "string.min": "Product name must be at least 1 character",
      "string.max": "Product name must not exceed 200 characters",
    }),
  }),
};

/**
 * Validation schema for bulk update
 * PATCH /api/admin/products/bulk-update
 */
export const bulkUpdateProductsSchema = {
  body: Joi.object({
    productIds: Joi.array()
      .items(objectId)
      .min(1)
      .max(100)
      .required()
      .messages({
        "array.min": "At least one product ID is required",
        "array.max": "Cannot update more than 100 products at once",
        "any.required": "Product IDs are required",
      }),
    updates: Joi.object({
      status: Joi.string().valid("draft", "active", "archived"),
      isFeatured: Joi.boolean(),
      isBestseller: Joi.boolean(),
      isNewArrival: Joi.boolean(),
      brand: objectId.allow(null).messages({
        "string.pattern.base": "Invalid brand ID format",
      }),
    }).min(1).messages({
      "object.min": "At least one field is required to update",
    }),
  }),
};

/**
 * Validation schema for product sub-resources
 * GET /api/products/:slug/variants, /media, /ingredients, /related
 */
export const productSubResourceSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
};

/**
 * Validation schema for related products query
 * GET /api/products/:slug/related
 */
export const productRelatedQuerySchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Product slug is required",
      "any.required": "Product slug is required",
    }),
  }),
  query: Joi.object({
    type: Joi.string().valid("crossSell", "upSell", "frequentlyBoughtTogether"),
    limit: Joi.number().integer().min(1).max(20).default(10),
  }),
};

export default {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSlugParamSchema,
  listProductsQuerySchema,
  listProductsAdminQuerySchema,
  updateProductStatusSchema,
  updateProductFlagsSchema,
  duplicateProductSchema,
  bulkUpdateProductsSchema,
  productSubResourceSchema,
  productRelatedQuerySchema,
};
