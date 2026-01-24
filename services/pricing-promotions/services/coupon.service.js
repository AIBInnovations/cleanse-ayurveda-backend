import Coupon from "../models/coupon.model.js";
import CouponUsage from "../models/couponUsage.model.js";

/**
 * Validate coupon code
 * @param {string} code - Coupon code
 * @param {string} userId - User ID (optional for guest users)
 * @param {object} cartData - Cart data with subtotal
 * @returns {Promise<{valid: boolean, coupon?: object, error?: string}>}
 */
export const validateCoupon = async (code, userId, cartData) => {
  try {
    console.log(`> Validating coupon: ${code}`);

    // Find active coupon by code (case-insensitive)
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      deletedAt: null,
    });

    if (!coupon) {
      console.log(`> Coupon not found or inactive: ${code}`);
      return { valid: false, error: "Invalid or inactive coupon code" };
    }

    // Check date range
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      console.log(`> Coupon not yet valid: ${code}`);
      return { valid: false, error: "Coupon is not yet valid" };
    }

    if (coupon.endsAt && now > coupon.endsAt) {
      console.log(`> Coupon expired: ${code}`);
      return { valid: false, error: "Coupon has expired" };
    }

    // Check total usage limit
    if (
      coupon.usageLimitTotal !== null &&
      coupon.usageCount >= coupon.usageLimitTotal
    ) {
      console.log(`> Coupon usage limit reached: ${code}`);
      return { valid: false, error: "Coupon usage limit reached" };
    }

    // Check per-user usage limit (only if userId provided)
    if (userId && coupon.usageLimitPerUser !== null) {
      const userUsageCount = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId: userId,
      });

      if (userUsageCount >= coupon.usageLimitPerUser) {
        console.log(`> User usage limit reached for coupon: ${code}`);
        return { valid: false, error: "You have already used this coupon" };
      }
    }

    // Check minimum order value
    if (coupon.minOrderValue > 0 && cartData.subtotal < coupon.minOrderValue) {
      console.log(`> Minimum order value not met: ${code}`);
      return {
        valid: false,
        error: `Minimum order value of ${coupon.minOrderValue} required`,
      };
    }

    console.log(`> Coupon validated successfully: ${code}`);
    return { valid: true, coupon };
  } catch (error) {
    console.log(`> Error validating coupon: ${error.message}`);
    return { valid: false, error: "Error validating coupon" };
  }
};

/**
 * Calculate discount amount for a coupon
 * @param {object} coupon - Coupon object
 * @param {object} cartData - Cart data with subtotal
 * @returns {number} - Discount amount (rounded to 2 decimals)
 */
export const calculateCouponDiscount = (coupon, cartData) => {
  try {
    console.log(`> Calculating discount for coupon: ${coupon.code}`);

    let discount = 0;

    switch (coupon.type) {
      case "percentage":
        discount = (cartData.subtotal * coupon.value) / 100;
        // Apply maxDiscount cap if set
        if (coupon.maxDiscount !== null && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
        break;

      case "fixed_amount":
        discount = coupon.value;
        // Don't exceed cart subtotal
        if (discount > cartData.subtotal) {
          discount = cartData.subtotal;
        }
        break;

      case "free_shipping":
        // Free shipping discount would be handled by shipping calculation
        // Return 0 here, actual discount applied during checkout
        discount = 0;
        break;

      default:
        console.log(`> Unknown coupon type: ${coupon.type}`);
        discount = 0;
    }

    // Round to 2 decimal places
    discount = Math.round(discount * 100) / 100;

    console.log(`> Calculated discount: ${discount}`);
    return discount;
  } catch (error) {
    console.log(`> Error calculating coupon discount: ${error.message}`);
    return 0;
  }
};

export default {
  validateCoupon,
  calculateCouponDiscount,
};
