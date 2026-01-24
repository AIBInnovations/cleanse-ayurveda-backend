import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import * as paymentsController from "./payments.controller.js";
import * as paymentsValidation from "./payments.validation.js";

/**
 * Consumer Payments Routes
 * Base path: /api/payments
 */
const consumerRouter = express.Router();

/**
 * @route   POST /api/payments/verify-signature
 * @desc    Verify payment signature after payment
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/verify-signature",
  authenticateUser,
  validate(paymentsValidation.verifyPaymentSignatureSchema),
  paymentsController.verifyPaymentSignature
);

/**
 * Admin Payments Routes
 * Base path: /api/admin/payments
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/payments/stats
 * @desc    Get payment statistics
 * @access  Private (Admin)
 */
adminRouter.get(
  "/stats",
  authenticateAdmin,
  validate(paymentsValidation.getPaymentStatsSchema),
  paymentsController.getPaymentStats
);

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments with filters
 * @access  Private (Admin)
 */
adminRouter.get(
  "/",
  authenticateAdmin,
  validate(paymentsValidation.getAllPaymentsSchema),
  paymentsController.getAllPayments
);

/**
 * @route   GET /api/admin/payments/:paymentId
 * @desc    Get payment by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:paymentId",
  authenticateAdmin,
  validate(paymentsValidation.getPaymentByIdSchema),
  paymentsController.getPaymentById
);

/**
 * @route   POST /api/admin/payments/:paymentId/retry
 * @desc    Retry failed payment
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:paymentId/retry",
  authenticateAdmin,
  validate(paymentsValidation.retryPaymentSchema),
  paymentsController.retryPayment
);

/**
 * @route   POST /api/admin/payments/:paymentId/capture
 * @desc    Capture authorized payment
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:paymentId/capture",
  authenticateAdmin,
  validate(paymentsValidation.capturePaymentSchema),
  paymentsController.capturePayment
);

/**
 * @route   POST /api/admin/payments/:paymentId/refund
 * @desc    Refund payment
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:paymentId/refund",
  authenticateAdmin,
  validate(paymentsValidation.refundPaymentSchema),
  paymentsController.refundPayment
);

/**
 * @route   POST /api/admin/payments/delayed-payment
 * @desc    Handle delayed payment processing
 * @access  Private (Admin)
 */
adminRouter.post(
  "/delayed-payment",
  authenticateAdmin,
  validate(paymentsValidation.handleDelayedPaymentSchema),
  paymentsController.handleDelayedPayment
);

/**
 * Webhook Router
 * Base path: /api/webhooks
 */
const webhookRouter = express.Router();

/**
 * @route   POST /api/webhooks/razorpay
 * @desc    Handle Razorpay webhook events
 * @access  Public (Webhook)
 */
webhookRouter.post("/razorpay", paymentsController.handleRazorpayWebhook);

/**
 * Export routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
export const webhook = webhookRouter;
