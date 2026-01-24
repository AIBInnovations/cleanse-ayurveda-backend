import { Router } from "express";
import {
  getAllTierDiscounts,
  createTierDiscount,
  getTierDiscountById,
  updateTierDiscount,
  deleteTierDiscount,
} from "./tier-discounts.controller.js";
import {
  createTierDiscountSchema,
  updateTierDiscountSchema,
} from "./tier-discounts.validator.js";
import { validateBody } from "@shared/middlewares";
import { authenticateAdmin } from "../../middlewares/auth.middleware.js";

// Admin router
const adminRouter = Router();

/**
 * @route GET /api/admin/tier-discounts
 * @description Get all tier discounts with pagination and filters
 * @access Admin
 */
adminRouter.get("/", authenticateAdmin, getAllTierDiscounts);

/**
 * @route POST /api/admin/tier-discounts
 * @description Create new tier discount with levels
 * @access Admin
 */
adminRouter.post(
  "/",
  authenticateAdmin,
  validateBody(createTierDiscountSchema),
  createTierDiscount
);

/**
 * @route GET /api/admin/tier-discounts/:id
 * @description Get single tier discount details
 * @access Admin
 */
adminRouter.get("/:id", authenticateAdmin, getTierDiscountById);

/**
 * @route PUT /api/admin/tier-discounts/:id
 * @description Update tier discount
 * @access Admin
 */
adminRouter.put(
  "/:id",
  authenticateAdmin,
  validateBody(updateTierDiscountSchema),
  updateTierDiscount
);

/**
 * @route DELETE /api/admin/tier-discounts/:id
 * @description Delete tier discount
 * @access Admin
 */
adminRouter.delete("/:id", authenticateAdmin, deleteTierDiscount);

export default {
  admin: adminRouter,
};
