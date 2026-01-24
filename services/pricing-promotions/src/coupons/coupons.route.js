import { Router } from "express";
import {
  validateCouponCode,
  getAllCoupons,
  createCoupon,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getCouponUsage,
} from "./coupons.controller.js";
import {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
} from "./coupons.validator.js";
import { validateBody } from "@shared/middlewares";
import { authenticateAdmin } from "../../middlewares/auth.middleware.js";

// Consumer router
const consumerRouter = Router();

/**
 * @route POST /api/coupons/validate
 * @description Validate coupon code
 * @access Public
 */
consumerRouter.post(
  "/validate",
  validateBody(validateCouponSchema),
  validateCouponCode
);

// Admin router
const adminRouter = Router();

/**
 * @route GET /api/admin/coupons
 * @description Get all coupons with pagination and filters
 * @access Admin
 */
adminRouter.get("/", authenticateAdmin, getAllCoupons);

/**
 * @route POST /api/admin/coupons
 * @description Create new coupon
 * @access Admin
 */
adminRouter.post(
  "/",
  authenticateAdmin,
  validateBody(createCouponSchema),
  createCoupon
);

/**
 * @route GET /api/admin/coupons/:id
 * @description Get single coupon details
 * @access Admin
 */
adminRouter.get("/:id", authenticateAdmin, getCouponById);

/**
 * @route PUT /api/admin/coupons/:id
 * @description Update coupon
 * @access Admin
 */
adminRouter.put(
  "/:id",
  authenticateAdmin,
  validateBody(updateCouponSchema),
  updateCoupon
);

/**
 * @route DELETE /api/admin/coupons/:id
 * @description Soft delete coupon
 * @access Admin
 */
adminRouter.delete("/:id", authenticateAdmin, deleteCoupon);

/**
 * @route GET /api/admin/coupons/:id/usage
 * @description Get coupon usage report
 * @access Admin
 */
adminRouter.get("/:id/usage", authenticateAdmin, getCouponUsage);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
