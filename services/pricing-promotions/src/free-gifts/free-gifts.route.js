import { Router } from "express";
import {
  getAllFreeGiftRules,
  createFreeGiftRule,
  getFreeGiftRuleById,
  updateFreeGiftRule,
  deleteFreeGiftRule,
} from "./free-gifts.controller.js";
import {
  createFreeGiftRuleSchema,
  updateFreeGiftRuleSchema,
} from "./free-gifts.validator.js";
import { validateBody } from "@shared/middlewares";
import { authenticateAdmin } from "../../middlewares/auth.middleware.js";

// Admin router
const adminRouter = Router();

/**
 * @route GET /api/admin/free-gift-rules
 * @description Get all free gift rules with pagination and filters
 * @access Admin
 */
adminRouter.get("/", authenticateAdmin, getAllFreeGiftRules);

/**
 * @route POST /api/admin/free-gift-rules
 * @description Create new free gift rule
 * @access Admin
 */
adminRouter.post(
  "/",
  authenticateAdmin,
  validateBody(createFreeGiftRuleSchema),
  createFreeGiftRule
);

/**
 * @route GET /api/admin/free-gift-rules/:id
 * @description Get single free gift rule details
 * @access Admin
 */
adminRouter.get("/:id", authenticateAdmin, getFreeGiftRuleById);

/**
 * @route PUT /api/admin/free-gift-rules/:id
 * @description Update free gift rule
 * @access Admin
 */
adminRouter.put(
  "/:id",
  authenticateAdmin,
  validateBody(updateFreeGiftRuleSchema),
  updateFreeGiftRule
);

/**
 * @route DELETE /api/admin/free-gift-rules/:id
 * @description Delete free gift rule
 * @access Admin
 */
adminRouter.delete("/:id", authenticateAdmin, deleteFreeGiftRule);

export default {
  admin: adminRouter,
};
