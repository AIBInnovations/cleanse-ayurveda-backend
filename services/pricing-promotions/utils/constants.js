/**
 * Pricing & Promotions Service Constants
 */

// Import and re-export HTTP_STATUS from @shared/utils
import { HTTP_STATUS } from "@shared/utils";
export { HTTP_STATUS };

// Coupon status
export const COUPON_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  EXPIRED: "expired",
};

// Discount type
export const DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixed_amount",
  FREE_SHIPPING: "free_shipping",
};

// Customer eligibility
export const CUSTOMER_ELIGIBILITY = {
  ALL: "all",
  FIRST_ORDER: "first_order",
  SPECIFIC_SEGMENTS: "specific_segments",
};

// Applies to
export const APPLIES_TO = {
  ALL: "all",
  SPECIFIC_PRODUCTS: "specific_products",
  SPECIFIC_COLLECTIONS: "specific_collections",
};

// Tier type
export const TIER_TYPE = {
  CART_VALUE: "cart_value",
  CART_QUANTITY: "cart_quantity",
};

// Trigger type (for free gifts)
export const TRIGGER_TYPE = {
  CART_VALUE: "cart_value",
  PRODUCT_PURCHASE: "product_purchase",
};

// Audit actions for pricing & promotions
export const AUDIT_ACTION = {
  // Coupon actions
  COUPON_CREATED: "COUPON_CREATED",
  COUPON_UPDATED: "COUPON_UPDATED",
  COUPON_DELETED: "COUPON_DELETED",
  COUPON_ACTIVATED: "COUPON_ACTIVATED",
  COUPON_DEACTIVATED: "COUPON_DEACTIVATED",
  COUPON_USED: "COUPON_USED",

  // Automatic discount actions
  AUTOMATIC_DISCOUNT_CREATED: "AUTOMATIC_DISCOUNT_CREATED",
  AUTOMATIC_DISCOUNT_UPDATED: "AUTOMATIC_DISCOUNT_UPDATED",
  AUTOMATIC_DISCOUNT_DELETED: "AUTOMATIC_DISCOUNT_DELETED",
  AUTOMATIC_DISCOUNT_ACTIVATED: "AUTOMATIC_DISCOUNT_ACTIVATED",
  AUTOMATIC_DISCOUNT_DEACTIVATED: "AUTOMATIC_DISCOUNT_DEACTIVATED",

  // Tier discount actions
  TIER_DISCOUNT_CREATED: "TIER_DISCOUNT_CREATED",
  TIER_DISCOUNT_UPDATED: "TIER_DISCOUNT_UPDATED",
  TIER_DISCOUNT_DELETED: "TIER_DISCOUNT_DELETED",
  TIER_DISCOUNT_ACTIVATED: "TIER_DISCOUNT_ACTIVATED",
  TIER_DISCOUNT_DEACTIVATED: "TIER_DISCOUNT_DEACTIVATED",

  // Free gift actions
  FREE_GIFT_RULE_CREATED: "FREE_GIFT_RULE_CREATED",
  FREE_GIFT_RULE_UPDATED: "FREE_GIFT_RULE_UPDATED",
  FREE_GIFT_RULE_DELETED: "FREE_GIFT_RULE_DELETED",
  FREE_GIFT_RULE_ACTIVATED: "FREE_GIFT_RULE_ACTIVATED",
  FREE_GIFT_RULE_DEACTIVATED: "FREE_GIFT_RULE_DEACTIVATED",
};

// Entity types for pricing & promotions
export const ENTITY_TYPE = {
  COUPON: "Coupon",
  COUPON_USAGE: "CouponUsage",
  AUTOMATIC_DISCOUNT: "AutomaticDiscount",
  TIER_DISCOUNT: "TierDiscount",
  FREE_GIFT_RULE: "FreeGiftRule",
};

export default {
  HTTP_STATUS,
  COUPON_STATUS,
  DISCOUNT_TYPE,
  CUSTOMER_ELIGIBILITY,
  APPLIES_TO,
  TIER_TYPE,
  TRIGGER_TYPE,
  AUDIT_ACTION,
  ENTITY_TYPE,
};
