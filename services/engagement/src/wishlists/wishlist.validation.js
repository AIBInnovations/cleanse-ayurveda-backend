import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for adding item to wishlist
 * POST /api/wishlist/items
 */
export const addItemSchema = {
  body: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
    variantId: objectId.allow(null).messages({
      "string.pattern.base": "Invalid variant ID format",
    }),
  }),
};

/**
 * Validation schema for removing item from wishlist
 * DELETE /api/wishlist/items/:productId
 */
export const removeItemSchema = {
  params: Joi.object({
    productId: objectId.required().messages({
      "string.pattern.base": "Invalid product ID format",
      "any.required": "Product ID is required",
    }),
  }),
};

/**
 * Validation schema for getting wishlist
 * GET /api/wishlist
 */
export const getWishlistSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

export default {
  addItemSchema,
  removeItemSchema,
  getWishlistSchema,
};
