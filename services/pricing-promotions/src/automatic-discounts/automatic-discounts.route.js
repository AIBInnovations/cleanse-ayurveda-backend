import { Router } from "express";
import {
  getAllAutomaticDiscounts,
  createAutomaticDiscount,
  getAutomaticDiscountById,
  updateAutomaticDiscount,
  deleteAutomaticDiscount,
} from "./automatic-discounts.controller.js";
import {
  createAutomaticDiscountSchema,
  updateAutomaticDiscountSchema,
} from "./automatic-discounts.validator.js";
import { validateBody } from "@shared/middlewares";
import { authenticateAdmin } from "../../middlewares/auth.middleware.js";

// Admin router
const adminRouter = Router();

/**
 * @route GET /api/admin/automatic-discounts
 * @description Get all automatic discounts with pagination and filters
 * @access Admin
 */
adminRouter.get("/", authenticateAdmin, getAllAutomaticDiscounts);

/**
 * @route POST /api/admin/automatic-discounts
 * @description Create new automatic discount
 * @access Admin
 */
adminRouter.post(
  "/",
  authenticateAdmin,
  validateBody(createAutomaticDiscountSchema),
  createAutomaticDiscount
);

/**
 * @route GET /api/admin/automatic-discounts/:id
 * @description Get single automatic discount details
 * @access Admin
 */
adminRouter.get("/:id", authenticateAdmin, getAutomaticDiscountById);

/**
 * @route PUT /api/admin/automatic-discounts/:id
 * @description Update automatic discount
 * @access Admin
 */
adminRouter.put(
  "/:id",
  authenticateAdmin,
  validateBody(updateAutomaticDiscountSchema),
  updateAutomaticDiscount
);

/**
 * @route DELETE /api/admin/automatic-discounts/:id
 * @description Delete automatic discount
 * @access Admin
 */
adminRouter.delete("/:id", authenticateAdmin, deleteAutomaticDiscount);

export default {
  admin: adminRouter,
};
