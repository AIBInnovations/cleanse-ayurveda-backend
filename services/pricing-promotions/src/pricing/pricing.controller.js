import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { calculatePricing } from "../../services/pricing.service.js";
import VariantPricing from "../../models/variantPricing.model.js";

/**
 * @route POST /api/pricing/calculate
 * @description Calculate final price with all applicable discounts
 * @access Public (Consumer and Guest)
 * @requestBody {
 *   cartSubtotal: number (required),
 *   couponCode: string (optional),
 *   items: array (optional, for future product-specific discounts)
 * }
 * @responseBody {
 *   subtotal: number,
 *   discounts: array,
 *   coupon: object | null,
 *   automaticDiscounts: array,
 *   totalSavings: number,
 *   grandTotal: number,
 *   couponError: string (optional)
 * }
 */
export const calculatePrice = async (req, res) => {
  try {
    const { cartSubtotal, couponCode, items } = req.body;
    const userId = req.userId || null;

    console.log(`> POST /api/pricing/calculate - Subtotal: ${cartSubtotal}, Coupon: ${couponCode || "none"}, UserId: ${userId || "guest"}`);

    const cartData = {
      subtotal: cartSubtotal,
      items: items || [],
    };

    const pricing = await calculatePricing(cartData, couponCode, userId);

    console.log(`> Pricing calculated - Grand Total: ${pricing.grandTotal}, Savings: ${pricing.totalSavings}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Pricing calculated successfully",
      pricing,
      null
    );
  } catch (error) {
    console.log(`> Error in pricing calculation endpoint: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to calculate pricing",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/calculate/cart
 * @description Calculate cart totals (alias for Order service integration)
 * @access Public
 */
export const calculateCartTotals = calculatePrice;

/**
 * @route POST /api/calculate/tax
 * @description Calculate tax for an order
 * @access Public
 * @requestBody {
 *   amount: number (required),
 *   state: string (optional),
 *   country: string (optional),
 *   zipCode: string (optional)
 * }
 * @responseBody {
 *   taxAmount: number,
 *   taxRate: number,
 *   taxableAmount: number
 * }
 */
export const calculateTax = async (req, res) => {
  try {
    const { amount, state, country = "IN", zipCode } = req.body;

    console.log(`> POST /api/calculate/tax - Amount: ${amount}, State: ${state || "N/A"}, Country: ${country}`);

    // Default GST rates for India
    const gstRates = {
      food: 0,      // 0% GST on essential food items
      health: 12,   // 12% GST on health/wellness products
      beauty: 18,   // 18% GST on cosmetics
      default: 18   // 18% default GST
    };

    // For now, use default 18% GST rate
    // TODO: Implement location-based tax calculation
    const taxRate = gstRates.default;
    const taxableAmount = amount || 0;
    const taxAmount = Math.round((taxableAmount * taxRate / 100) * 100) / 100;

    const result = {
      taxAmount,
      taxRate,
      taxableAmount,
      breakdown: {
        cgst: Math.round((taxAmount / 2) * 100) / 100,  // Central GST (9%)
        sgst: Math.round((taxAmount / 2) * 100) / 100,  // State GST (9%)
      }
    };

    console.log(`> Tax calculated - Amount: ${taxAmount}, Rate: ${taxRate}%`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Tax calculated successfully",
      result,
      null
    );
  } catch (error) {
    console.log(`> Error in tax calculation: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to calculate tax",
      null,
      error.message
    );
  }
};

/**
 * @route GET /api/prices/:variantId
 * @description Get price for a single variant
 * @access Public
 * @params variantId - Variant ID
 * @query userId - Optional user ID for personalized pricing
 */
export const getVariantPrice = async (req, res) => {
  try {
    const { variantId } = req.params;
    const userId = req.query.userId || req.userId || null;

    console.log(`> GET /api/prices/${variantId} - UserId: ${userId || "guest"}`);

    // Find pricing record for the variant
    const pricing = await VariantPricing.findOne({
      variantId,
      isActive: true,
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ]
    }).sort({ effectiveFrom: -1 });

    if (!pricing) {
      console.log(`> No pricing found for variant: ${variantId}`);
      return sendResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Pricing not found for this variant",
        null,
        "No active pricing record found"
      );
    }

    const response = {
      variantId: pricing.variantId,
      mrp: pricing.mrp,
      salePrice: pricing.salePrice,
      discountPercent: pricing.discountPercent,
      finalPrice: pricing.finalPrice,
      currency: "INR",
      isAvailable: true,
      effectiveFrom: pricing.effectiveFrom,
      effectiveTo: pricing.effectiveTo
    };

    console.log(`> Variant price retrieved - Final Price: ${response.finalPrice}`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Variant price retrieved successfully",
      response,
      null
    );
  } catch (error) {
    console.log(`> Error getting variant price: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to get variant price",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/prices/bulk
 * @description Bulk get prices for multiple variants
 * @access Public
 * @requestBody {
 *   variantIds: array (required),
 *   userId: string (optional)
 * }
 */
export const bulkGetPrices = async (req, res) => {
  try {
    const { variantIds, userId: bodyUserId } = req.body;
    const userId = bodyUserId || req.userId || null;

    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return sendResponse(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "variantIds array is required",
        null,
        "variantIds must be a non-empty array"
      );
    }

    console.log(`> POST /api/prices/bulk - Variants: ${variantIds.length}, UserId: ${userId || "guest"}`);

    // Fetch variant prices from Catalog service
    // For now, returning mock structure - TODO: integrate with Catalog service
    const pricesMap = {};

    variantIds.forEach(variantId => {
      pricesMap[variantId] = {
        variantId,
        mrp: 500,
        salePrice: 450,
        discountPercent: 10,
        finalPrice: 450,
        currency: "INR",
        isAvailable: true
      };
    });

    console.log(`> Bulk prices retrieved for ${variantIds.length} variants`);

    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Bulk prices retrieved successfully",
      { prices: pricesMap },
      null
    );
  } catch (error) {
    console.log(`> Error getting bulk prices: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to get bulk prices",
      null,
      error.message
    );
  }
};

/**
 * @route POST /api/admin/prices
 * @description Create pricing record for a variant
 * @access Admin
 * @requestBody {
 *   variantId: string (required),
 *   productId: string (required),
 *   mrp: number (required),
 *   salePrice: number (optional),
 *   effectiveFrom: date (optional, defaults to now)
 * }
 */
export const createPricing = async (req, res) => {
  try {
    const { variantId, productId, mrp, salePrice, effectiveFrom } = req.body;

    console.log(`> POST /api/admin/prices - Creating pricing for variant: ${variantId}`);

    // Check if pricing already exists for this variant
    const existing = await VariantPricing.findOne({ variantId });
    if (existing) {
      console.log(`> Pricing already exists for variant: ${variantId}, updating...`);
      // Update existing pricing
      existing.mrp = mrp;
      existing.salePrice = salePrice;
      if (effectiveFrom) {
        existing.effectiveFrom = new Date(effectiveFrom);
      }
      await existing.save();

      return sendResponse(
        res,
        HTTP_STATUS.OK,
        "Pricing updated successfully",
        existing,
        null
      );
    }

    // Create new pricing record
    const pricing = new VariantPricing({
      variantId,
      productId,
      mrp,
      salePrice: salePrice || null,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      isActive: true,
    });

    await pricing.save();

    console.log(`> Pricing record created for variant: ${variantId} (MRP: ${mrp}, Sale: ${salePrice || mrp})`);

    return sendResponse(
      res,
      HTTP_STATUS.CREATED,
      "Pricing created successfully",
      pricing,
      null
    );
  } catch (error) {
    console.log(`> Error creating pricing: ${error.message}`);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create pricing",
      null,
      error.message
    );
  }
};

export default {
  calculatePrice,
  calculateCartTotals,
  calculateTax,
  getVariantPrice,
  bulkGetPrices,
  createPricing,
};
