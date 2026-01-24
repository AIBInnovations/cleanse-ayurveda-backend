import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import { requireAuthOrGuest } from "../../middlewares/auth-or-guest.middleware.js";
import * as cartController from "./cart.controller.js";
import * as cartValidation from "./cart.validation.js";

/**
 * Consumer Cart Routes
 * Base path: /api/cart
 */
const consumerRouter = express.Router();

/**
 * @route   GET /api/cart
 * @desc    Get or create user's active cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.get(
  "/",
  requireAuthOrGuest,
  cartController.getCart
);

/**
 * @route   POST /api/cart/items
 * @desc    Add item to cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.post(
  "/items",
  requireAuthOrGuest,
  validate(cartValidation.addItemSchema),
  cartController.addItem
);

/**
 * @route   PUT /api/cart/items/:itemId
 * @desc    Update cart item quantity
 * @access  Private (Consumer or Guest)
 */
consumerRouter.put(
  "/items/:itemId",
  requireAuthOrGuest,
  validate(cartValidation.updateItemSchema),
  cartController.updateItem
);

/**
 * @route   DELETE /api/cart/items/:itemId
 * @desc    Remove item from cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.delete(
  "/items/:itemId",
  requireAuthOrGuest,
  validate(cartValidation.removeItemSchema),
  cartController.removeItem
);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Clear all items from cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.delete(
  "/clear",
  requireAuthOrGuest,
  cartController.clearCart
);

/**
 * @route   POST /api/cart/acknowledge-changes
 * @desc    Acknowledge price changes in cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.post(
  "/acknowledge-changes",
  requireAuthOrGuest,
  cartController.acknowledgeChanges
);

/**
 * @route   DELETE /api/cart/deleted-items
 * @desc    Remove deleted/unavailable items from cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.delete(
  "/deleted-items",
  requireAuthOrGuest,
  cartController.removeDeletedItems
);

/**
 * @route   POST /api/cart/coupons
 * @desc    Apply coupon to cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.post(
  "/coupons",
  requireAuthOrGuest,
  validate(cartValidation.applyCouponSchema),
  cartController.applyCoupon
);

/**
 * @route   DELETE /api/cart/coupons/:couponId
 * @desc    Remove coupon from cart
 * @access  Private (Consumer or Guest)
 */
consumerRouter.delete(
  "/coupons/:couponId",
  requireAuthOrGuest,
  validate(cartValidation.removeCouponSchema),
  cartController.removeCoupon
);

/**
 * Admin Cart Routes
 * Base path: /api/admin/cart
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/cart/abandoned
 * @desc    Get abandoned carts
 * @access  Private (Admin)
 */
adminRouter.get(
  "/abandoned",
  authenticateAdmin,
  validate(cartValidation.getAbandonedCartsSchema),
  cartController.getAbandonedCarts
);

/**
 * @route   GET /api/admin/cart/:cartId
 * @desc    Get cart by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:cartId",
  authenticateAdmin,
  validate(cartValidation.getCartByIdSchema),
  cartController.getCartById
);

/**
 * @route   DELETE /api/admin/cart/:cartId
 * @desc    Delete cart
 * @access  Private (Admin)
 */
adminRouter.delete(
  "/:cartId",
  authenticateAdmin,
  validate(cartValidation.deleteCartSchema),
  cartController.deleteCart
);

/**
 * Export both routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
