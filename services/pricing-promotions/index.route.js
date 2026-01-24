import { Router } from "express";
import { sendResponse } from "@shared/utils";
import { validateBody } from "@shared/middlewares";
import couponsRoutes from "./src/coupons/coupons.route.js";
import { calculatePrice, calculateCartTotals, calculateTax, getVariantPrice, bulkGetPrices, createPricing } from "./src/pricing/pricing.controller.js";
import { calculatePricingSchema } from "./src/pricing/pricing.validator.js";
import { validateCouponUsage } from "./src/coupons/coupons.controller.js";
import automaticDiscountsRoutes from "./src/automatic-discounts/automatic-discounts.route.js";
import tierDiscountsRoutes from "./src/tier-discounts/tier-discounts.route.js";
import freeGiftsRoutes from "./src/free-gifts/free-gifts.route.js";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

/**
 * Consumer Routes
 */

/**
 * @route /api/coupons
 * @description Coupon validation routes (consumer)
 */
router.use("/coupons", couponsRoutes.consumer);

/**
 * @route POST /api/pricing/calculate
 * @description Calculate final price with all applicable discounts
 * @access Public
 */
router.post("/pricing/calculate", validateBody(calculatePricingSchema), calculatePrice);
router.post("/calculate", validateBody(calculatePricingSchema), calculatePrice); // Alias for gateway routing

/**
 * @route POST /api/calculate/cart
 * @description Calculate cart totals (Order service integration endpoint)
 * @access Public
 */
router.post("/calculate/cart", validateBody(calculatePricingSchema), calculateCartTotals);

/**
 * @route POST /api/calculate/tax
 * @description Calculate tax for an order
 * @access Public
 */
router.post("/calculate/tax", calculateTax);
router.post("/tax", calculateTax); // Alias for gateway routing

/**
 * @route POST /api/coupons/usage/validate
 * @description Validate coupon usage limits
 * @access Public
 */
router.post("/coupons/usage/validate", validateCouponUsage);

/**
 * @route GET /api/prices/:variantId
 * @description Get price for a single variant
 * @access Public
 */
router.get("/prices/:variantId", getVariantPrice);

/**
 * @route POST /api/prices/bulk
 * @description Bulk get prices for multiple variants
 * @access Public
 */
router.post("/prices/bulk", bulkGetPrices);

/**
 * Admin Routes
 */

/**
 * @route /api/admin/coupons
 * @description Coupon management routes (admin)
 */
router.use("/admin/coupons", couponsRoutes.admin);

/**
 * @route /api/admin/automatic-discounts
 * @description Automatic discount management routes (admin)
 */
router.use("/admin/automatic-discounts", automaticDiscountsRoutes.admin);

/**
 * @route /api/admin/tier-discounts
 * @description Tier discount management routes (admin)
 */
router.use("/admin/tier-discounts", tierDiscountsRoutes.admin);

/**
 * @route /api/admin/free-gift-rules
 * @description Free gift rule management routes (admin)
 */
router.use("/admin/free-gift-rules", freeGiftsRoutes.admin);

/**
 * @route POST /api/admin/prices
 * @description Create/update pricing record for a variant
 * @access Admin
 */
router.post("/admin/prices", createPricing);

export default router;
