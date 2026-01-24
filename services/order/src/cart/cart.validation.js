import Joi from "joi";

/**
 * Validation schemas for cart operations
 */

/**
 * Add item to cart validation
 */
export const addItemSchema = {
  body: Joi.object({
    productId: Joi.string().required().messages({
      "string.empty": "Product ID is required",
      "any.required": "Product ID is required"
    }),
    variantId: Joi.string().required().messages({
      "string.empty": "Variant ID is required",
      "any.required": "Variant ID is required"
    }),
    quantity: Joi.number().integer().min(1).max(999).required().messages({
      "number.base": "Quantity must be a number",
      "number.min": "Quantity must be at least 1",
      "number.max": "Quantity cannot exceed 999",
      "any.required": "Quantity is required"
    }),
    customization: Joi.object().optional()
  })
};

/**
 * Update cart item validation
 */
export const updateItemSchema = {
  params: Joi.object({
    itemId: Joi.string().required().messages({
      "string.empty": "Item ID is required",
      "any.required": "Item ID is required"
    })
  }),
  body: Joi.object({
    quantity: Joi.number().integer().min(1).max(999).required().messages({
      "number.base": "Quantity must be a number",
      "number.min": "Quantity must be at least 1",
      "number.max": "Quantity cannot exceed 999",
      "any.required": "Quantity is required"
    }),
    customization: Joi.object().optional()
  })
};

/**
 * Remove cart item validation
 */
export const removeItemSchema = {
  params: Joi.object({
    itemId: Joi.string().required().messages({
      "string.empty": "Item ID is required",
      "any.required": "Item ID is required"
    })
  })
};

/**
 * Apply coupon validation
 */
export const applyCouponSchema = {
  body: Joi.object({
    couponCode: Joi.string().trim().uppercase().required().messages({
      "string.empty": "Coupon code is required",
      "any.required": "Coupon code is required"
    })
  })
};

/**
 * Remove coupon validation
 */
export const removeCouponSchema = {
  params: Joi.object({
    couponId: Joi.string().required().messages({
      "string.empty": "Coupon ID is required",
      "any.required": "Coupon ID is required"
    })
  })
};

/**
 * Get abandoned carts validation (admin)
 */
export const getAbandonedCartsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    minValue: Joi.number().min(0).optional(),
    maxValue: Joi.number().min(0).optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional()
  })
};

/**
 * Get cart by ID validation (admin)
 */
export const getCartByIdSchema = {
  params: Joi.object({
    cartId: Joi.string().required().messages({
      "string.empty": "Cart ID is required",
      "any.required": "Cart ID is required"
    })
  })
};

/**
 * Delete cart validation (admin)
 */
export const deleteCartSchema = {
  params: Joi.object({
    cartId: Joi.string().required().messages({
      "string.empty": "Cart ID is required",
      "any.required": "Cart ID is required"
    })
  })
};
