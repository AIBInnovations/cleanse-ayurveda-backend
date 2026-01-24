import { validateCoupon, calculateCouponDiscount } from "./coupon.service.js";
import { evaluateAutomaticDiscounts, calculateAutomaticDiscount } from "./discount.service.js";

/**
 * Calculate complete pricing with all applicable discounts
 * @param {object} cartData - Cart data with subtotal and items
 * @param {string} appliedCouponCode - Optional coupon code
 * @param {string} userId - Optional user ID
 * @returns {Promise<object>} - Complete pricing breakdown
 */
export const calculatePricing = async (cartData, appliedCouponCode = null, userId = null) => {
  try {
    console.log(`> Calculating pricing for cart subtotal: ${cartData.subtotal}`);

    // Initialize pricing object
    const pricing = {
      subtotal: cartData.subtotal,
      discounts: [],
      coupon: null,
      automaticDiscounts: [],
      totalSavings: 0,
      grandTotal: cartData.subtotal,
    };

    // Validate and apply coupon if provided
    if (appliedCouponCode) {
      console.log(`> Validating coupon: ${appliedCouponCode}`);
      const couponValidation = await validateCoupon(appliedCouponCode, userId, cartData);

      if (couponValidation.valid) {
        const couponDiscount = calculateCouponDiscount(couponValidation.coupon, cartData);

        if (couponDiscount > 0) {
          pricing.coupon = {
            code: couponValidation.coupon.code,
            name: couponValidation.coupon.name,
            type: couponValidation.coupon.type,
            discount: couponDiscount,
          };

          pricing.discounts.push({
            type: "coupon",
            name: couponValidation.coupon.name,
            code: couponValidation.coupon.code,
            amount: couponDiscount,
          });

          pricing.totalSavings += couponDiscount;
          console.log(`> Coupon applied: ${couponValidation.coupon.code}, discount: ${couponDiscount}`);
        }
      } else {
        console.log(`> Coupon validation failed: ${couponValidation.error}`);
        pricing.couponError = couponValidation.error;
      }
    }

    // Evaluate and apply automatic discounts
    console.log(`> Evaluating automatic discounts`);
    const eligibleDiscounts = await evaluateAutomaticDiscounts(cartData);

    for (const discount of eligibleDiscounts) {
      const discountAmount = calculateAutomaticDiscount(discount, cartData);

      if (discountAmount > 0) {
        // Check if stackable
        if (!discount.isStackable && pricing.totalSavings > 0) {
          console.log(`> Skipping non-stackable discount: ${discount.name}`);
          continue;
        }

        pricing.automaticDiscounts.push({
          id: discount._id,
          name: discount.name,
          type: discount.type,
          amount: discountAmount,
          priority: discount.priority,
        });

        pricing.discounts.push({
          type: "automatic",
          name: discount.name,
          amount: discountAmount,
        });

        pricing.totalSavings += discountAmount;
        console.log(`> Automatic discount applied: ${discount.name}, amount: ${discountAmount}`);

        // If not stackable, break after first discount
        if (!discount.isStackable) {
          break;
        }
      }
    }

    // Calculate grand total
    pricing.grandTotal = Math.max(0, pricing.subtotal - pricing.totalSavings);
    pricing.grandTotal = Math.round(pricing.grandTotal * 100) / 100;
    pricing.totalSavings = Math.round(pricing.totalSavings * 100) / 100;

    console.log(`> Pricing calculated - Subtotal: ${pricing.subtotal}, Savings: ${pricing.totalSavings}, Grand Total: ${pricing.grandTotal}`);
    return pricing;
  } catch (error) {
    console.log(`> Error calculating pricing: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);

    // Return basic pricing on error
    return {
      subtotal: cartData.subtotal,
      discounts: [],
      coupon: null,
      automaticDiscounts: [],
      totalSavings: 0,
      grandTotal: cartData.subtotal,
      error: "Error calculating pricing",
    };
  }
};

export default {
  calculatePricing,
};
