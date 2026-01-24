import mongoose from "mongoose";

// Counter for generating sequential numbers
let orderCounter = 0;
let refundCounter = 0;
let returnCounter = 0;
let invoiceCounter = 0;

/**
 * Generate a unique order number
 * Format: ORD-YYYY-XXXXXX
 * @returns {string} Order number
 */
export const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  orderCounter++;
  const paddedCounter = String(orderCounter).padStart(6, "0");
  return `ORD-${year}-${paddedCounter}`;
};

/**
 * Generate a unique refund number
 * Format: REF-YYYY-XXXXXX
 * @returns {string} Refund number
 */
export const generateRefundNumber = () => {
  const year = new Date().getFullYear();
  refundCounter++;
  const paddedCounter = String(refundCounter).padStart(6, "0");
  return `REF-${year}-${paddedCounter}`;
};

/**
 * Generate a unique return number
 * Format: RET-YYYY-XXXXXX
 * @returns {string} Return number
 */
export const generateReturnNumber = () => {
  const year = new Date().getFullYear();
  returnCounter++;
  const paddedCounter = String(returnCounter).padStart(6, "0");
  return `RET-${year}-${paddedCounter}`;
};

/**
 * Generate a unique invoice number
 * Format: INV-YYYY-XXXXXX
 * @returns {string} Invoice number
 */
export const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  invoiceCounter++;
  const paddedCounter = String(invoiceCounter).padStart(6, "0");
  return `INV-${year}-${paddedCounter}`;
};

/**
 * Calculate cart totals including discounts
 * @param {Array} items - Array of cart items with lineTotal
 * @param {Array} appliedCoupons - Array of applied coupons with discountAmount
 * @param {Array} appliedDiscounts - Array of applied automatic discounts with discountAmount
 * @returns {Object} Calculated totals
 */
export const calculateCartTotals = (items, appliedCoupons = [], appliedDiscounts = []) => {
  const subtotal = items.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  const couponDiscount = appliedCoupons.reduce((sum, coupon) => sum + (coupon.discountAmount || 0), 0);

  const autoDiscount = appliedDiscounts.reduce((sum, discount) => sum + (discount.discountAmount || 0), 0);

  const discountTotal = couponDiscount + autoDiscount;

  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountTotal: parseFloat(discountTotal.toFixed(2)),
    itemCount,
    couponDiscount: parseFloat(couponDiscount.toFixed(2)),
    autoDiscount: parseFloat(autoDiscount.toFixed(2))
  };
};

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if valid ObjectId
 */
export const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Sanitize order data for external service calls
 * Removes sensitive information and formats data
 * @param {Object} order - Order object
 * @returns {Object} Sanitized order data
 */
export const sanitizeOrderData = (order) => {
  const sanitized = {
    orderId: order._id || order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    items: order.items?.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal: order.subtotal,
    taxAmount: order.taxAmount,
    shippingCharge: order.shippingCharge,
    totalAmount: order.totalAmount,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
    createdAt: order.createdAt
  };

  return sanitized;
};

/**
 * Format price with currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: INR)
 * @returns {string} Formatted price string
 */
export const formatPrice = (amount, currency = "INR") => {
  const formatted = parseFloat(amount).toFixed(2);
  return `${currency} ${formatted}`;
};

/**
 * Calculate refund amount based on order items
 * @param {Array} orderItems - Array of order items to refund
 * @param {number} originalTotalAmount - Original order total
 * @param {number} originalShippingCharge - Original shipping charge
 * @returns {Object} Refund calculation details
 */
export const calculateRefundAmount = (orderItems, originalTotalAmount, originalShippingCharge) => {
  const itemsTotal = orderItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0);

  const refundShipping = orderItems.length > 0 ? originalShippingCharge : 0;

  const refundAmount = itemsTotal + refundShipping;

  return {
    itemsTotal: parseFloat(itemsTotal.toFixed(2)),
    shippingRefund: parseFloat(refundShipping.toFixed(2)),
    refundAmount: parseFloat(refundAmount.toFixed(2))
  };
};

/**
 * Check if return window is valid for an order
 * @param {Date} deliveryDate - Order delivery date
 * @param {number} returnWindowDays - Number of days for return window
 * @returns {boolean} True if within return window
 */
export const isWithinReturnWindow = (deliveryDate, returnWindowDays = 7) => {
  if (!deliveryDate) return false;

  const currentDate = new Date();
  const windowEndDate = new Date(deliveryDate);
  windowEndDate.setDate(windowEndDate.getDate() + returnWindowDays);

  return currentDate <= windowEndDate;
};

/**
 * Generate idempotency key for payment operations
 * @param {string} userId - User ID
 * @param {string} orderId - Order ID
 * @param {string} operation - Operation type
 * @returns {string} Idempotency key
 */
export const generateIdempotencyKey = (userId, orderId, operation = "payment") => {
  const timestamp = Date.now();
  return `${operation}-${userId}-${orderId}-${timestamp}`;
};

/**
 * Parse and validate shipping address
 * @param {Object} address - Address object
 * @returns {Object} Validated address with all required fields
 */
export const validateShippingAddress = (address) => {
  const required = ["fullName", "phone", "addressLine1", "city", "state", "pincode", "country"];

  const missing = required.filter(field => !address[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required address fields: ${missing.join(", ")}`);
  }

  return {
    fullName: address.fullName.trim(),
    phone: address.phone.trim(),
    addressLine1: address.addressLine1.trim(),
    addressLine2: address.addressLine2?.trim() || "",
    landmark: address.landmark?.trim() || "",
    city: address.city.trim(),
    state: address.state.trim(),
    pincode: address.pincode.trim(),
    country: address.country.trim(),
    isDefault: address.isDefault || false
  };
};
