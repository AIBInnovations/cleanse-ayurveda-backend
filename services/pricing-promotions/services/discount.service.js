import AutomaticDiscount from "../models/automaticDiscount.model.js";

/**
 * Evaluate and get eligible automatic discounts
 * @param {object} cartData - Cart data with subtotal
 * @returns {Promise<Array>} - Array of eligible automatic discounts
 */
export const evaluateAutomaticDiscounts = async (cartData) => {
  try {
    console.log(`> Evaluating automatic discounts for cart subtotal: ${cartData.subtotal}`);

    const now = new Date();

    // Find all active automatic discounts within date range
    const query = {
      isActive: true,
      $or: [
        { startsAt: null, endsAt: null },
        { startsAt: { $lte: now }, endsAt: null },
        { startsAt: null, endsAt: { $gte: now } },
        { startsAt: { $lte: now }, endsAt: { $gte: now } },
      ],
    };

    const discounts = await AutomaticDiscount.find(query).sort({ priority: -1 });

    // Filter by minimum order value
    const eligibleDiscounts = discounts.filter(
      (discount) => cartData.subtotal >= discount.minOrderValue
    );

    console.log(`> Found ${eligibleDiscounts.length} eligible automatic discounts`);
    return eligibleDiscounts;
  } catch (error) {
    console.log(`> Error evaluating automatic discounts: ${error.message}`);
    return [];
  }
};

/**
 * Calculate discount amount for an automatic discount
 * @param {object} discount - Automatic discount object
 * @param {object} cartData - Cart data with subtotal
 * @returns {number} - Discount amount (rounded to 2 decimals)
 */
export const calculateAutomaticDiscount = (discount, cartData) => {
  try {
    console.log(`> Calculating automatic discount: ${discount.name}`);

    let discountAmount = 0;

    switch (discount.type) {
      case "percentage":
        discountAmount = (cartData.subtotal * discount.value) / 100;
        // Apply maxDiscount cap if set
        if (discount.maxDiscount !== null && discountAmount > discount.maxDiscount) {
          discountAmount = discount.maxDiscount;
        }
        break;

      case "fixed_amount":
        discountAmount = discount.value;
        // Don't exceed cart subtotal
        if (discountAmount > cartData.subtotal) {
          discountAmount = cartData.subtotal;
        }
        break;

      default:
        console.log(`> Unknown discount type: ${discount.type}`);
        discountAmount = 0;
    }

    // Round to 2 decimal places
    discountAmount = Math.round(discountAmount * 100) / 100;

    console.log(`> Calculated automatic discount amount: ${discountAmount}`);
    return discountAmount;
  } catch (error) {
    console.log(`> Error calculating automatic discount: ${error.message}`);
    return 0;
  }
};

export default {
  evaluateAutomaticDiscounts,
  calculateAutomaticDiscount,
};
