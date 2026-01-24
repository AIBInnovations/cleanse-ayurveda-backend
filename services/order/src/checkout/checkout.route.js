import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import * as checkoutController from "./checkout.controller.js";
import * as checkoutValidation from "./checkout.validation.js";

/**
 * Consumer Checkout Routes
 * Base path: /api/checkout
 */
const consumerRouter = express.Router();

/**
 * @route   POST /api/checkout
 * @desc    Initiate checkout from cart
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/",
  authenticateUser,
  validate(checkoutValidation.initiateCheckoutSchema),
  checkoutController.initiateCheckout
);

/**
 * @route   GET /api/checkout/:sessionId
 * @desc    Get checkout session
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:sessionId",
  authenticateUser,
  validate(checkoutValidation.getCheckoutSessionSchema),
  checkoutController.getCheckoutSession
);

/**
 * @route   PUT /api/checkout/:sessionId/shipping-address
 * @desc    Update shipping address
 * @access  Private (Consumer)
 */
consumerRouter.put(
  "/:sessionId/shipping-address",
  authenticateUser,
  validate(checkoutValidation.updateShippingAddressSchema),
  checkoutController.updateShippingAddress
);

/**
 * @route   PUT /api/checkout/:sessionId/billing-address
 * @desc    Update billing address
 * @access  Private (Consumer)
 */
consumerRouter.put(
  "/:sessionId/billing-address",
  authenticateUser,
  validate(checkoutValidation.updateBillingAddressSchema),
  checkoutController.updateBillingAddress
);

/**
 * @route   PUT /api/checkout/:sessionId/shipping-method
 * @desc    Select shipping method
 * @access  Private (Consumer)
 */
consumerRouter.put(
  "/:sessionId/shipping-method",
  authenticateUser,
  validate(checkoutValidation.selectShippingMethodSchema),
  checkoutController.selectShippingMethod
);

/**
 * @route   POST /api/checkout/:sessionId/complete
 * @desc    Complete checkout and create order
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/:sessionId/complete",
  authenticateUser,
  validate(checkoutValidation.completeCheckoutSchema),
  checkoutController.completeCheckout
);

/**
 * @route   DELETE /api/checkout/:sessionId
 * @desc    Cancel checkout session
 * @access  Private (Consumer)
 */
consumerRouter.delete(
  "/:sessionId",
  authenticateUser,
  validate(checkoutValidation.cancelCheckoutSchema),
  checkoutController.cancelCheckout
);

/**
 * Admin Checkout Routes
 * Base path: /api/admin/checkout
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/checkout/expired
 * @desc    Get expired checkout sessions
 * @access  Private (Admin)
 */
adminRouter.get(
  "/expired",
  authenticateAdmin,
  validate(checkoutValidation.getExpiredCheckoutsSchema),
  checkoutController.getExpiredCheckouts
);

/**
 * @route   GET /api/admin/checkout/:sessionId
 * @desc    Get checkout session by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:sessionId",
  authenticateAdmin,
  validate(checkoutValidation.getCheckoutByIdSchema),
  checkoutController.getCheckoutById
);

/**
 * Export both routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
