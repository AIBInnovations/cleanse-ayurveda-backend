// Cart Constants
export const CART_STATUS = {
  ACTIVE: "active",
  ABANDONED: "abandoned",
  CONVERTED: "converted"
};

// Checkout Constants
export const CHECKOUT_STATUS = {
  INITIATED: "initiated",
  ADDRESS_ENTERED: "address_entered",
  PAYMENT_PENDING: "payment_pending",
  COMPLETED: "completed",
  FAILED: "failed",
  EXPIRED: "expired"
};

// Order Constants
export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURNED: "returned",
  REFUNDED: "refunded"
};

export const ORDER_CANCEL_REASON = {
  CUSTOMER_REQUEST: "customer_request",
  OUT_OF_STOCK: "out_of_stock",
  PAYMENT_FAILED: "payment_failed",
  FRAUDULENT: "fraudulent",
  DUPLICATE_ORDER: "duplicate_order",
  OTHER: "other"
};

export const FULFILLMENT_STATUS = {
  UNFULFILLED: "unfulfilled",
  PARTIALLY_FULFILLED: "partially_fulfilled",
  FULFILLED: "fulfilled"
};

export const SHIPPING_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  IN_TRANSIT: "in_transit",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  FAILED: "failed",
  RETURNED: "returned"
};

// Order Status History
export const STATUS_TYPE = {
  ORDER: "order",
  PAYMENT: "payment",
  FULFILLMENT: "fulfillment"
};

export const CHANGED_BY_TYPE = {
  SYSTEM: "system",
  ADMIN: "admin",
  CUSTOMER: "customer"
};

// Payment Constants
export const PAYMENT_STATUS = {
  PENDING: "pending",
  INITIATED: "initiated",
  PROCESSING: "processing",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded"
};

export const PAYMENT_METHOD = {
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
  UPI: "upi",
  NET_BANKING: "net_banking",
  WALLET: "wallet",
  COD: "cod",
  EMI: "emi"
};

// Refund Constants
export const REFUND_STATUS = {
  PENDING: "pending",
  INITIATED: "initiated",
  PROCESSING: "processing",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  FAILED: "failed"
};

export const REFUND_REASON = {
  RETURN_APPROVED: "return_approved",
  ORDER_CANCELLED: "order_cancelled",
  DUPLICATE_PAYMENT: "duplicate_payment",
  DAMAGED_PRODUCT: "damaged_product",
  WRONG_PRODUCT: "wrong_product",
  QUALITY_ISSUE: "quality_issue",
  NOT_AS_DESCRIBED: "not_as_described",
  CUSTOMER_REQUEST: "customer_request",
  OTHER: "other"
};

// Return Constants
export const RETURN_STATUS = {
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  PICKUP_SCHEDULED: "pickup_scheduled",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  RECEIVED: "received",
  INSPECTED: "inspected",
  REFUND_INITIATED: "refund_initiated",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

export const RETURN_REASON = {
  DAMAGED: "damaged",
  WRONG_ITEM: "wrong_item",
  NOT_AS_DESCRIBED: "not_as_described",
  QUALITY_ISSUE: "quality_issue",
  SIZE_ISSUE: "size_issue",
  CHANGED_MIND: "changed_mind",
  BETTER_PRICE: "better_price",
  LATE_DELIVERY: "late_delivery",
  OTHER: "other"
};

// Invoice Constants
export const INVOICE_STATUS = {
  DRAFT: "draft",
  GENERATED: "generated",
  SENT: "sent",
  PAID: "paid",
  CANCELLED: "cancelled"
};

// Time Constants
export const CART_EXPIRY_HOURS = 72;
export const CHECKOUT_EXPIRY_MINUTES = 30;
export const INVENTORY_RESERVATION_MINUTES = 30;
export const PAYMENT_TIMEOUT_MINUTES = 15;
export const RETURN_WINDOW_DAYS = 7;
export const REFUND_PROCESSING_DAYS = 5;

// Pagination Constants
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Price Constants
export const MIN_ORDER_VALUE = 0;
export const MAX_CART_ITEMS = 50;

// Notification Events
export const NOTIFICATION_EVENTS = {
  ORDER_PLACED: "order_placed",
  ORDER_CONFIRMED: "order_confirmed",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
  ORDER_CANCELLED: "order_cancelled",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  REFUND_INITIATED: "refund_initiated",
  REFUND_COMPLETED: "refund_completed",
  RETURN_APPROVED: "return_approved",
  RETURN_REJECTED: "return_rejected",
  CART_ABANDONED: "cart_abandoned"
};

// Error Messages
export const ERROR_MESSAGES = {
  CART_NOT_FOUND: "Cart not found",
  CART_EMPTY: "Cart is empty",
  CART_ITEM_NOT_FOUND: "Cart item not found",
  INVALID_QUANTITY: "Invalid quantity",
  STOCK_UNAVAILABLE: "Product is out of stock",
  CHECKOUT_NOT_FOUND: "Checkout session not found",
  CHECKOUT_EXPIRED: "Checkout session has expired",
  ORDER_NOT_FOUND: "Order not found",
  PAYMENT_NOT_FOUND: "Payment not found",
  PAYMENT_FAILED: "Payment processing failed",
  REFUND_NOT_FOUND: "Refund not found",
  RETURN_NOT_FOUND: "Return not found",
  RETURN_WINDOW_CLOSED: "Return window has closed",
  INVOICE_NOT_FOUND: "Invoice not found",
  UNAUTHORIZED_ACCESS: "You do not have access to this resource",
  INVALID_ADDRESS: "Invalid shipping address",
  INVALID_PAYMENT_METHOD: "Invalid payment method"
};

// Success Messages
export const SUCCESS_MESSAGES = {
  CART_FETCHED: "Cart fetched successfully",
  ITEM_ADDED: "Item added to cart successfully",
  ITEM_UPDATED: "Cart item updated successfully",
  ITEM_REMOVED: "Item removed from cart successfully",
  CART_CLEARED: "Cart cleared successfully",
  CHECKOUT_INITIATED: "Checkout initiated successfully",
  ORDER_PLACED: "Order placed successfully",
  ORDER_CANCELLED: "Order cancelled successfully",
  PAYMENT_SUCCESS: "Payment completed successfully",
  REFUND_INITIATED: "Refund initiated successfully",
  RETURN_REQUESTED: "Return requested successfully",
  INVOICE_GENERATED: "Invoice generated successfully"
};
