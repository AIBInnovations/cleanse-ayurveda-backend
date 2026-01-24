import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const pricingClient = createHttpClient(
  process.env.PRICING_SERVICE_URL || "http://localhost:3004",
  parseInt(process.env.PRICING_SERVICE_TIMEOUT) || TimeoutConfig.STANDARD,
  "pricing"
);

/**
 * Calculate cart totals with discounts and taxes
 * @param {Object} cartData - Cart data {items, userId, appliedCoupons}
 * @returns {Promise<Object>} Calculated totals
 */
export const calculateCartTotals = async (cartData) => {
  try {
    const response = await pricingClient.post("/api/calculate/cart", cartData);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Validate and apply coupon code
 * @param {string} couponCode - Coupon code to validate
 * @param {string} userId - User ID
 * @param {Object} cartData - Cart data for validation
 * @returns {Promise<Object>} Coupon validation result
 */
export const validateCoupon = async (couponCode, userId, cartData) => {
  try {
    const response = await pricingClient.post("/api/coupons/validate", {
      code: couponCode,
      userId,
      cartData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Get applicable automatic discounts for cart
 * @param {string} userId - User ID
 * @param {Object} cartData - Cart data
 * @returns {Promise<Object>} Applicable discounts
 */
export const getApplicableDiscounts = async (userId, cartData) => {
  try {
    const response = await pricingClient.post("/api/discounts/applicable", {
      userId,
      cartData
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Calculate tax for order
 * @param {Object} orderData - Order data with shipping address
 * @returns {Promise<Object>} Tax calculation result
 */
export const calculateTax = async (orderData) => {
  try {
    const response = await pricingClient.post("/api/calculate/tax", orderData);
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Get current price for a variant
 * @param {string} variantId - Variant ID
 * @param {string} userId - Optional user ID for personalized pricing
 * @returns {Promise<Object>} Price information
 */
export const getVariantPrice = async (variantId, userId = null) => {
  try {
    const params = userId ? { userId } : {};
    const response = await pricingClient.get(`/api/prices/${variantId}`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Bulk get prices for multiple variants
 * @param {Array} variantIds - Array of variant IDs
 * @param {string} userId - Optional user ID
 * @returns {Promise<Object>} Bulk price result
 */
export const bulkGetPrices = async (variantIds, userId = null) => {
  try {
    const response = await pricingClient.post("/api/prices/bulk", {
      variantIds,
      userId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Apply bundle pricing
 * @param {string} bundleId - Bundle ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Bundle price result
 */
export const getBundlePrice = async (bundleId, userId = null) => {
  try {
    const params = userId ? { userId } : {};
    const response = await pricingClient.get(`/api/bundles/${bundleId}/price`, { params });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Validate coupon usage limits
 * @param {string} couponCode - Coupon code
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Usage validation result
 */
export const validateCouponUsage = async (couponCode, userId) => {
  try {
    const response = await pricingClient.post("/api/coupons/usage/validate", {
      code: couponCode,
      userId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};

/**
 * Record coupon usage after order
 * @param {string} couponCode - Coupon code
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Usage record result
 */
export const recordCouponUsage = async (couponCode, userId, orderId) => {
  try {
    const response = await pricingClient.post("/api/coupons/usage", {
      code: couponCode,
      userId,
      orderId
    });
    return { success: true, data: response.data };
  } catch (error) {
    return handleServiceError(error, "Pricing");
  }
};
