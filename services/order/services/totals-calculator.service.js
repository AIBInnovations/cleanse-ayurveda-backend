/**
 * Totals Calculator Service
 * Calculates order totals including discounts, shipping, and taxes
 */

/**
 * Calculate line total for cart/order item
 * @param {number} quantity - Item quantity
 * @param {number} unitPrice - Unit price
 * @param {number} lineDiscount - Line discount amount
 * @returns {number} Line total
 */
export const calculateLineTotal = (quantity, unitPrice, lineDiscount = 0) => {
  const subtotal = quantity * unitPrice;
  return Math.max(0, subtotal - lineDiscount);
};

/**
 * Calculate cart subtotal from items
 * @param {Array} items - Array of cart items
 * @returns {number} Subtotal
 */
export const calculateSubtotal = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    return total + (item.lineTotal || 0);
  }, 0);
};

/**
 * Calculate total discount from coupons and auto-discounts
 * @param {Array} appliedCoupons - Applied coupons
 * @param {Array} appliedDiscounts - Applied automatic discounts
 * @returns {Object} Discount breakdown
 */
export const calculateDiscountTotal = (appliedCoupons = [], appliedDiscounts = []) => {
  const couponDiscount = appliedCoupons.reduce((total, coupon) => {
    return total + (coupon.discountAmount || 0);
  }, 0);

  const autoDiscount = appliedDiscounts.reduce((total, discount) => {
    return total + (discount.discountAmount || 0);
  }, 0);

  return {
    couponDiscount: parseFloat(couponDiscount.toFixed(2)),
    autoDiscount: parseFloat(autoDiscount.toFixed(2)),
    total: parseFloat((couponDiscount + autoDiscount).toFixed(2))
  };
};

/**
 * Calculate tax amount based on Indian GST rules
 * @param {number} taxableAmount - Amount to calculate tax on
 * @param {number} taxRate - Tax rate percentage (e.g., 18 for 18%)
 * @param {boolean} isInterState - Is shipment inter-state
 * @returns {Object} Tax breakdown
 */
export const calculateTax = (taxableAmount, taxRate, isInterState = false) => {
  const totalTax = (taxableAmount * taxRate) / 100;

  if (isInterState) {
    return {
      igst: parseFloat(totalTax.toFixed(2)),
      cgst: 0,
      sgst: 0,
      totalTax: parseFloat(totalTax.toFixed(2))
    };
  } else {
    const halfTax = totalTax / 2;
    return {
      igst: 0,
      cgst: parseFloat(halfTax.toFixed(2)),
      sgst: parseFloat(halfTax.toFixed(2)),
      totalTax: parseFloat(totalTax.toFixed(2))
    };
  }
};

/**
 * Calculate order grand total
 * @param {number} subtotal - Subtotal amount
 * @param {number} discountTotal - Total discount
 * @param {number} shippingCharge - Shipping charge
 * @param {number} taxTotal - Total tax
 * @returns {number} Grand total
 */
export const calculateGrandTotal = (subtotal, discountTotal, shippingCharge, taxTotal) => {
  const total = subtotal - discountTotal + shippingCharge + taxTotal;
  return Math.max(0, parseFloat(total.toFixed(2)));
};

/**
 * Calculate complete cart totals
 * @param {Object} cartData - Cart data with items, coupons, discounts
 * @param {number} shippingCharge - Shipping charge
 * @param {number} taxRate - Tax rate percentage
 * @param {boolean} isInterState - Is inter-state shipment
 * @returns {Object} Complete totals breakdown
 */
export const calculateCartTotals = (cartData, shippingCharge = 0, taxRate = 0, isInterState = false) => {
  const subtotal = calculateSubtotal(cartData.items || []);

  const discounts = calculateDiscountTotal(
    cartData.appliedCoupons || [],
    cartData.appliedDiscounts || []
  );

  const taxableAmount = subtotal - discounts.total + shippingCharge;

  const tax = calculateTax(taxableAmount, taxRate, isInterState);

  const grandTotal = calculateGrandTotal(
    subtotal,
    discounts.total,
    shippingCharge,
    tax.totalTax
  );

  const itemCount = (cartData.items || []).reduce((count, item) => {
    return count + (item.quantity || 0);
  }, 0);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountTotal: discounts.total,
    couponDiscount: discounts.couponDiscount,
    autoDiscount: discounts.autoDiscount,
    shippingTotal: parseFloat(shippingCharge.toFixed(2)),
    taxTotal: tax.totalTax,
    taxBreakdown: tax,
    grandTotal,
    itemCount
  };
};

/**
 * Calculate refund amount
 * @param {Array} refundItems - Items to refund with quantities
 * @param {number} originalShipping - Original shipping charge
 * @param {boolean} refundShipping - Whether to refund shipping
 * @returns {Object} Refund calculation
 */
export const calculateRefundAmount = (refundItems, originalShipping = 0, refundShipping = false) => {
  const itemsTotal = refundItems.reduce((total, item) => {
    return total + (item.amount || 0);
  }, 0);

  const shippingRefund = refundShipping ? originalShipping : 0;

  const refundTotal = itemsTotal + shippingRefund;

  return {
    itemsTotal: parseFloat(itemsTotal.toFixed(2)),
    shippingRefund: parseFloat(shippingRefund.toFixed(2)),
    refundTotal: parseFloat(refundTotal.toFixed(2))
  };
};

/**
 * Calculate partial refund percentage
 * @param {number} refundAmount - Amount being refunded
 * @param {number} originalTotal - Original order total
 * @returns {number} Refund percentage
 */
export const calculateRefundPercentage = (refundAmount, originalTotal) => {
  if (originalTotal === 0) return 0;
  return parseFloat(((refundAmount / originalTotal) * 100).toFixed(2));
};

/**
 * Calculate COD charge
 * @param {number} orderTotal - Order total amount
 * @param {number} codFeePercent - COD fee percentage
 * @param {number} codFeeMin - Minimum COD fee
 * @param {number} codFeeMax - Maximum COD fee
 * @returns {number} COD charge
 */
export const calculateCodCharge = (orderTotal, codFeePercent = 2, codFeeMin = 0, codFeeMax = 100) => {
  const codFee = (orderTotal * codFeePercent) / 100;
  const finalFee = Math.max(codFeeMin, Math.min(codFee, codFeeMax));
  return parseFloat(finalFee.toFixed(2));
};

/**
 * Validate calculated totals match expected values
 * @param {Object} calculated - Calculated totals
 * @param {Object} expected - Expected totals
 * @param {number} tolerance - Tolerance for rounding differences
 * @returns {Object} Validation result
 */
export const validateTotals = (calculated, expected, tolerance = 0.01) => {
  const differences = {};
  let isValid = true;

  const fields = ["subtotal", "discountTotal", "shippingTotal", "taxTotal", "grandTotal"];

  fields.forEach(field => {
    const diff = Math.abs((calculated[field] || 0) - (expected[field] || 0));
    if (diff > tolerance) {
      differences[field] = {
        calculated: calculated[field],
        expected: expected[field],
        difference: diff
      };
      isValid = false;
    }
  });

  return {
    isValid,
    differences: isValid ? null : differences
  };
};

/**
 * Round amount to 2 decimal places
 * @param {number} amount - Amount to round
 * @returns {number} Rounded amount
 */
export const roundAmount = (amount) => {
  return parseFloat(amount.toFixed(2));
};
