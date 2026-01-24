import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Image schema
 */
const imageSchema = Joi.object({
  url: Joi.string().uri().allow(null, ""),
  publicId: Joi.string().allow(null, ""),
});

/**
 * Bundle item schema for adding items
 */
const bundleItemSchema = Joi.object({
  productId: objectId.required().messages({
    "string.pattern.base": "Invalid product ID format",
    "any.required": "Product ID is required",
  }),
  variantId: objectId.allow(null).messages({
    "string.pattern.base": "Invalid variant ID format",
  }),
  quantity: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Quantity must be a number",
    "number.min": "Quantity must be at least 1",
  }),
  sortOrder: Joi.number().integer().min(0).default(0),
});

/**
 * Validation schema for creating a bundle
 * POST /api/admin/bundles
 */
export const createBundleSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).required().messages({
      "string.empty": "Bundle name is required",
      "string.min": "Bundle name must be at least 1 character",
      "string.max": "Bundle name must not exceed 200 characters",
      "any.required": "Bundle name is required",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200)
      .messages({
        "string.pattern.base":
          "Slug must contain only lowercase letters, numbers, and hyphens",
        "string.max": "Slug must not exceed 200 characters",
      }),
    description: Joi.string().trim().max(2000).allow(null, ""),
    image: imageSchema.default({}),
    pricingType: Joi.string()
      .valid("fixed", "percentageOff")
      .required()
      .messages({
        "any.only": "Pricing type must be either 'fixed' or 'percentageOff'",
        "any.required": "Pricing type is required",
      }),
    fixedPrice: Joi.number().min(0).allow(null).messages({
      "number.base": "Fixed price must be a number",
      "number.min": "Fixed price cannot be negative",
    }),
    percentageOff: Joi.number().min(0).max(100).allow(null).messages({
      "number.base": "Percentage off must be a number",
      "number.min": "Percentage off cannot be negative",
      "number.max": "Percentage off cannot exceed 100",
    }),
    validFrom: Joi.date().iso().allow(null).messages({
      "date.format": "Valid from must be a valid ISO date",
    }),
    validTo: Joi.date().iso().greater(Joi.ref("validFrom")).allow(null).messages({
      "date.format": "Valid to must be a valid ISO date",
      "date.greater": "Valid to must be after valid from",
    }),
    isActive: Joi.boolean().default(true),
  })
    .custom((value, helpers) => {
      if (value.pricingType === "fixed" && value.fixedPrice == null) {
        return helpers.error("any.custom", {
          message: "Fixed price is required when pricing type is 'fixed'",
        });
      }
      if (value.pricingType === "percentageOff" && value.percentageOff == null) {
        return helpers.error("any.custom", {
          message:
            "Percentage off is required when pricing type is 'percentageOff'",
        });
      }
      return value;
    })
    .messages({
      "any.custom": "{{#message}}",
    }),
};

/**
 * Validation schema for updating a bundle
 * PUT /api/admin/bundles/:id
 */
export const updateBundleSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(200).messages({
      "string.empty": "Bundle name cannot be empty",
      "string.min": "Bundle name must be at least 1 character",
      "string.max": "Bundle name must not exceed 200 characters",
    }),
    slug: Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(200)
      .messages({
        "string.pattern.base":
          "Slug must contain only lowercase letters, numbers, and hyphens",
        "string.max": "Slug must not exceed 200 characters",
      }),
    description: Joi.string().trim().max(2000).allow(null, ""),
    image: imageSchema,
    pricingType: Joi.string().valid("fixed", "percentageOff").messages({
      "any.only": "Pricing type must be either 'fixed' or 'percentageOff'",
    }),
    fixedPrice: Joi.number().min(0).allow(null).messages({
      "number.base": "Fixed price must be a number",
      "number.min": "Fixed price cannot be negative",
    }),
    percentageOff: Joi.number().min(0).max(100).allow(null).messages({
      "number.base": "Percentage off must be a number",
      "number.min": "Percentage off cannot be negative",
      "number.max": "Percentage off cannot exceed 100",
    }),
    validFrom: Joi.date().iso().allow(null).messages({
      "date.format": "Valid from must be a valid ISO date",
    }),
    validTo: Joi.date().iso().allow(null).messages({
      "date.format": "Valid to must be a valid ISO date",
    }),
    isActive: Joi.boolean(),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for bundle ID param
 * GET/DELETE /api/admin/bundles/:id
 */
export const bundleIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
    }),
  }),
};

/**
 * Validation schema for bundle slug param (consumer)
 * GET /api/bundles/:slug
 */
export const bundleSlugParamSchema = {
  params: Joi.object({
    slug: Joi.string().trim().lowercase().required().messages({
      "string.empty": "Bundle slug is required",
      "any.required": "Bundle slug is required",
    }),
  }),
};

/**
 * Validation schema for toggling bundle status
 * PATCH /api/admin/bundles/:id/status
 */
export const toggleStatusSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
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
 * Validation schema for adding items to bundle
 * POST /api/admin/bundles/:id/items
 */
export const addItemsSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
    }),
  }),
  body: Joi.object({
    items: Joi.array()
      .items(bundleItemSchema)
      .min(1)
      .max(50)
      .required()
      .messages({
        "array.min": "At least one item is required",
        "array.max": "Cannot add more than 50 items at once",
        "any.required": "Items array is required",
      }),
  }),
};

/**
 * Validation schema for updating bundle item
 * PUT /api/admin/bundles/:id/items/:itemId
 */
export const updateItemSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
    }),
    itemId: objectId.required().messages({
      "string.pattern.base": "Invalid item ID format",
      "any.required": "Item ID is required",
    }),
  }),
  body: Joi.object({
    variantId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid variant ID format",
    }),
    quantity: Joi.number().integer().min(1).messages({
      "number.base": "Quantity must be a number",
      "number.min": "Quantity must be at least 1",
    }),
    sortOrder: Joi.number().integer().min(0),
  })
    .min(1)
    .messages({
      "object.min": "At least one field is required to update",
    }),
};

/**
 * Validation schema for removing item from bundle
 * DELETE /api/admin/bundles/:id/items/:itemId
 */
export const removeItemSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid bundle ID format",
      "any.required": "Bundle ID is required",
    }),
    itemId: objectId.required().messages({
      "string.pattern.base": "Invalid item ID format",
      "any.required": "Item ID is required",
    }),
  }),
};

/**
 * Validation schema for list bundles query (consumer)
 */
export const listBundlesQuerySchema = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

/**
 * Validation schema for admin list query
 */
export const adminListQuerySchema = {
  query: Joi.object({
    isActive: Joi.boolean(),
    search: Joi.string().trim().max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export default {
  createBundleSchema,
  updateBundleSchema,
  bundleIdParamSchema,
  bundleSlugParamSchema,
  toggleStatusSchema,
  addItemsSchema,
  updateItemSchema,
  removeItemSchema,
  listBundlesQuerySchema,
  adminListQuerySchema,
};
