import Joi from "joi";

/**
 * Validates MongoDB ObjectId format
 */
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for creating a variant
 * POST /api/admin/products/:productId/variants
 */
export const createVariantSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).required().messages({
      "string.empty": "Variant name is required",
      "string.min": "Variant name must be at least 1 character",
      "string.max": "Variant name must not exceed 100 characters",
      "any.required": "Variant name is required",
    }),
    sku: Joi.string().trim().min(1).max(50).required().messages({
      "string.empty": "SKU is required",
      "string.min": "SKU must be at least 1 character",
      "string.max": "SKU must not exceed 50 characters",
      "any.required": "SKU is required",
    }),
    barcode: Joi.string().trim().max(50).allow(null, ""),
    variantType: Joi.string().trim().max(50).allow(null, ""),
    mrp: Joi.number().positive().required().messages({
      "number.base": "MRP must be a number",
      "number.positive": "MRP must be a positive number",
      "any.required": "MRP is required",
    }),
    salePrice: Joi.number().positive().allow(null).messages({
      "number.base": "Sale price must be a number",
      "number.positive": "Sale price must be a positive number",
    }),
    costPrice: Joi.number().positive().allow(null).messages({
      "number.base": "Cost price must be a number",
      "number.positive": "Cost price must be a positive number",
    }),
    weight: Joi.object({
      value: Joi.number().positive().allow(null).messages({
        "number.base": "Weight value must be a number",
        "number.positive": "Weight value must be a positive number",
      }),
      unit: Joi.string().valid("g", "kg", "ml", "L", "oz", "lb").allow(null, "").messages({
        "any.only": "Weight unit must be one of: g, kg, ml, L, oz, lb",
      }),
    }).allow(null),
    isDefault: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true),
    sortOrder: Joi.number().integer().min(0).default(0),
  }),
};

/**
 * Validation schema for updating a variant
 * PUT /api/admin/variants/:id
 */
export const updateVariantSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid variant ID format",
      "any.required": "Variant ID is required",
    }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(1).max(100).messages({
      "string.empty": "Variant name cannot be empty",
      "string.min": "Variant name must be at least 1 character",
      "string.max": "Variant name must not exceed 100 characters",
    }),
    sku: Joi.string().trim().min(1).max(50).messages({
      "string.empty": "SKU cannot be empty",
      "string.min": "SKU must be at least 1 character",
      "string.max": "SKU must not exceed 50 characters",
    }),
    barcode: Joi.string().trim().max(50).allow(null, ""),
    variantType: Joi.string().trim().max(50).allow(null, ""),
    mrp: Joi.number().positive().messages({
      "number.base": "MRP must be a number",
      "number.positive": "MRP must be a positive number",
    }),
    salePrice: Joi.number().positive().allow(null).messages({
      "number.base": "Sale price must be a number",
      "number.positive": "Sale price must be a positive number",
    }),
    costPrice: Joi.number().positive().allow(null).messages({
      "number.base": "Cost price must be a number",
      "number.positive": "Cost price must be a positive number",
    }),
    weight: Joi.object({
      value: Joi.number().positive().allow(null).messages({
        "number.base": "Weight value must be a number",
        "number.positive": "Weight value must be a positive number",
      }),
      unit: Joi.string().valid("g", "kg", "ml", "L", "oz", "lb").allow(null, "").messages({
        "any.only": "Weight unit must be one of: g, kg, ml, L, oz, lb",
      }),
    }).allow(null),
    isDefault: Joi.boolean(),
    isActive: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
  }).min(1).messages({
    "object.min": "At least one field is required to update",
  }),
};

/**
 * Validation schema for variant ID param
 * GET/DELETE /api/admin/variants/:id
 */
export const variantIdParamSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid variant ID format",
      "any.required": "Variant ID is required",
    }),
  }),
};

/**
 * Validation schema for product ID param (admin list)
 * GET /api/admin/products/:productId/variants
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
 * Validation schema for product slug param (consumer)
 * GET /api/products/:productSlug/variants
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
 * Validation schema for toggling variant status
 * PATCH /api/admin/variants/:id/status
 */
export const toggleVariantStatusSchema = {
  params: Joi.object({
    id: objectId.required().messages({
      "string.pattern.base": "Invalid variant ID format",
      "any.required": "Variant ID is required",
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
 * Validation schema for reordering variants
 * PATCH /api/admin/variants/reorder
 */
export const reorderVariantsSchema = {
  body: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    variants: Joi.array()
      .items(
        Joi.object({
          id: objectId.required().messages({
            "string.pattern.base": "Invalid variant ID format",
            "any.required": "Variant ID is required",
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
        "array.min": "At least one variant is required",
        "any.required": "Variants array is required",
      }),
  }),
};

export default {
  createVariantSchema,
  updateVariantSchema,
  variantIdParamSchema,
  productIdParamSchema,
  productSlugParamSchema,
  toggleVariantStatusSchema,
  reorderVariantsSchema,
};
