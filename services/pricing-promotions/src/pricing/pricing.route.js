import { Router } from "express";
import { calculatePrice, getVariantPrice, bulkGetPrices, createPricing } from "./pricing.controller.js";
import { calculatePricingSchema } from "./pricing.validator.js";
import { validateBody } from "@shared/middlewares";

const router = Router();

/**
 * @route POST /api/pricing/calculate
 * @description Calculate final price with all applicable discounts
 * @access Public (Consumer and Guest)
 */
router.post("/calculate", validateBody(calculatePricingSchema), calculatePrice);

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
 * @route POST /api/admin/prices
 * @description Create/update pricing record for a variant
 * @access Admin
 */
router.post("/admin/prices", createPricing);

export default router;
