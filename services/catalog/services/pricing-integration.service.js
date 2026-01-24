import axios from "axios";

const PRICING_SERVICE_URL = process.env.PRICING_SERVICE_URL || "http://localhost:3004";

// Create axios instance with defaults
const pricingClient = axios.create({
  baseURL: PRICING_SERVICE_URL,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Create pricing record for a new variant
 * @param {string} variantId - Variant ID
 * @param {string} productId - Product ID
 * @param {number} mrp - Maximum retail price
 * @param {number} salePrice - Sale price (optional)
 * @param {Date} effectiveFrom - Effective from date (defaults to now)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const createPricingRecord = async (variantId, productId, mrp, salePrice = null, effectiveFrom = new Date()) => {
  try {
    console.log(`> Creating pricing record for variant ${variantId}`);

    const response = await pricingClient.post("/api/admin/prices", {
      variantId,
      productId,
      mrp,
      salePrice: salePrice || mrp,
      effectiveFrom: effectiveFrom.toISOString(),
    });

    console.log(`> Pricing record created successfully`);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(`> Warning: Failed to create pricing record: ${error.message}`);
    return {
      success: false,
      error: error.response?.data?.error || error.message,
    };
  }
};

export default {
  createPricingRecord,
};
