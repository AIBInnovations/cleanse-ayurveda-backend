/**
 * Snapshot Service
 * Creates immutable snapshots of data to preserve historical state
 */

/**
 * Create address snapshot
 * @param {Object} address - Address object from user service
 * @returns {Object} Immutable address snapshot
 */
export const createAddressSnapshot = (address) => {
  return {
    fullName: address.fullName || "",
    phone: address.phone || "",
    addressLine1: address.addressLine1 || "",
    addressLine2: address.addressLine2 || "",
    landmark: address.landmark || "",
    city: address.city || "",
    state: address.state || "",
    pincode: address.pincode || "",
    country: address.country || "India"
  };
};

/**
 * Create shipping method snapshot
 * @param {Object} shippingMethod - Shipping method from shipping service
 * @returns {Object} Immutable shipping method snapshot
 */
export const createShippingMethodSnapshot = (shippingMethod) => {
  return {
    methodId: shippingMethod.methodId || shippingMethod._id,
    name: shippingMethod.name || "",
    displayName: shippingMethod.displayName || shippingMethod.name || "",
    carrierName: shippingMethod.carrierName || "",
    rate: shippingMethod.rate || 0,
    estimatedDaysMin: shippingMethod.estimatedDaysMin || 0,
    estimatedDaysMax: shippingMethod.estimatedDaysMax || 0,
    isCodAvailable: shippingMethod.isCodAvailable || false
  };
};

/**
 * Create cart totals snapshot
 * @param {Object} cart - Cart object with calculated totals
 * @returns {Object} Immutable totals snapshot
 */
export const createTotalsSnapshot = (cart) => {
  return {
    subtotal: cart.subtotal || 0,
    discountTotal: cart.discountTotal || 0,
    shippingTotal: cart.shippingTotal || 0,
    taxTotal: cart.taxTotal || 0,
    grandTotal: cart.grandTotal || 0,
    itemCount: cart.itemCount || 0
  };
};

/**
 * Create applied coupons snapshot
 * @param {Array} coupons - Array of applied coupons
 * @returns {Array} Immutable coupons snapshot
 */
export const createCouponsSnapshot = (coupons) => {
  if (!Array.isArray(coupons) || coupons.length === 0) {
    return [];
  }

  return coupons.map(coupon => ({
    couponId: coupon.couponId || coupon._id,
    code: coupon.code || "",
    discountAmount: coupon.discountAmount || 0,
    discountType: coupon.discountType || "fixed"
  }));
};

/**
 * Create order item snapshot from cart item
 * @param {Object} cartItem - Cart item object
 * @param {Object} productData - Product data from catalog service
 * @param {string} orderId - Order ID
 * @returns {Object} Order item data
 */
export const createOrderItemSnapshot = (cartItem, productData, orderId) => {
  return {
    orderId,
    productId: cartItem.productId,
    variantId: cartItem.variantId,
    bundleId: cartItem.bundleId || null,
    sku: productData.sku || "",
    name: productData.name || "",
    imageUrl: productData.imageUrl || productData.image || "",
    quantity: cartItem.quantity,
    quantityFulfilled: 0,
    quantityReturned: 0,
    quantityRefunded: 0,
    unitPrice: cartItem.unitPrice,
    unitMrp: cartItem.unitMrp || cartItem.unitPrice,
    lineDiscount: cartItem.lineDiscount || cartItem.discount || 0,
    lineTax: 0,
    lineTotal: cartItem.lineTotal,
    hsnCode: productData.hsnCode || "",
    isFreeGift: cartItem.isFreeGift || false,
    fulfillmentStatus: "unfulfilled"
  };
};

/**
 * Create product metadata snapshot for invoice
 * @param {Object} orderItem - Order item object
 * @returns {Object} Product metadata
 */
export const createProductMetadataSnapshot = (orderItem) => {
  return {
    name: orderItem.name,
    sku: orderItem.sku,
    hsnCode: orderItem.hsnCode,
    quantity: orderItem.quantity,
    unitPrice: orderItem.unitPrice,
    lineTotal: orderItem.lineTotal,
    lineTax: orderItem.lineTax
  };
};

/**
 * Create payment method details snapshot
 * @param {Object} paymentMethod - Payment method details from gateway
 * @returns {Object} Safe payment method snapshot (no sensitive data)
 */
export const createPaymentMethodSnapshot = (paymentMethod) => {
  const snapshot = {
    method: paymentMethod.method || "unknown",
    provider: paymentMethod.provider || ""
  };

  if (paymentMethod.method === "card") {
    snapshot.cardLast4 = paymentMethod.cardLast4 || "";
    snapshot.cardBrand = paymentMethod.cardBrand || "";
    snapshot.cardType = paymentMethod.cardType || "";
  }

  if (paymentMethod.method === "upi") {
    snapshot.upiId = paymentMethod.upiId ? maskUpiId(paymentMethod.upiId) : "";
  }

  if (paymentMethod.method === "netbanking") {
    snapshot.bank = paymentMethod.bank || "";
  }

  if (paymentMethod.method === "wallet") {
    snapshot.walletProvider = paymentMethod.walletProvider || "";
  }

  return snapshot;
};

/**
 * Mask UPI ID for privacy
 * @param {string} upiId - Full UPI ID
 * @returns {string} Masked UPI ID
 */
const maskUpiId = (upiId) => {
  if (!upiId || typeof upiId !== "string") return "";

  const parts = upiId.split("@");
  if (parts.length !== 2) return "***@***";

  const username = parts[0];
  if (username.length <= 3) return `***@${parts[1]}`;

  const masked = username.substring(0, 2) + "***" + username.substring(username.length - 1);
  return `${masked}@${parts[1]}`;
};

/**
 * Create refund items snapshot
 * @param {Array} items - Array of {orderItemId, quantity, amount}
 * @returns {Array} Refund items snapshot
 */
export const createRefundItemsSnapshot = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map(item => ({
    orderItemId: item.orderItemId,
    quantity: item.quantity,
    amount: item.amount
  }));
};

/**
 * Create return items snapshot
 * @param {Array} items - Array of return item details
 * @returns {Array} Return items snapshot
 */
export const createReturnItemsSnapshot = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map(item => ({
    orderItemId: item.orderItemId,
    quantity: item.quantity,
    reason: item.reason || "",
    condition: item.condition || "",
    images: Array.isArray(item.images) ? item.images : []
  }));
};

/**
 * Validate address snapshot has required fields
 * @param {Object} addressSnapshot - Address snapshot to validate
 * @returns {boolean} True if valid
 */
export const validateAddressSnapshot = (addressSnapshot) => {
  const required = ["fullName", "phone", "addressLine1", "city", "state", "pincode", "country"];
  return required.every(field => addressSnapshot[field] && addressSnapshot[field].trim().length > 0);
};
