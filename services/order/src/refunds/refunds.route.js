import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import * as refundsController from "./refunds.controller.js";
import * as refundsValidation from "./refunds.validation.js";

/**
 * Consumer Refunds Routes
 * Base path: /api/refunds
 */
const consumerRouter = express.Router();

/**
 * @route   POST /api/refunds
 * @desc    Request a refund
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/",
  authenticateUser,
  validate(refundsValidation.requestRefundSchema),
  refundsController.requestRefund
);

/**
 * @route   GET /api/refunds
 * @desc    Get my refunds
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/",
  authenticateUser,
  validate(refundsValidation.getMyRefundsSchema),
  refundsController.getMyRefunds
);

/**
 * @route   GET /api/refunds/:refundId
 * @desc    Get refund by ID
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:refundId",
  authenticateUser,
  validate(refundsValidation.getRefundByIdSchema),
  refundsController.getRefundById
);

/**
 * @route   POST /api/refunds/:refundId/cancel
 * @desc    Cancel refund request
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/:refundId/cancel",
  authenticateUser,
  validate(refundsValidation.cancelRefundSchema),
  refundsController.cancelRefund
);

/**
 * Admin Refunds Routes
 * Base path: /api/admin/refunds
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/refunds/stats
 * @desc    Get refund statistics
 * @access  Private (Admin)
 */
adminRouter.get(
  "/stats",
  authenticateAdmin,
  validate(refundsValidation.getRefundStatsSchema),
  refundsController.getRefundStats
);

/**
 * @route   GET /api/admin/refunds
 * @desc    Get all refunds with filters
 * @access  Private (Admin)
 */
adminRouter.get(
  "/",
  authenticateAdmin,
  validate(refundsValidation.getAllRefundsSchema),
  refundsController.getAllRefunds
);

/**
 * @route   GET /api/admin/refunds/:refundId
 * @desc    Get refund by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:refundId",
  authenticateAdmin,
  validate(refundsValidation.getRefundByIdAdminSchema),
  refundsController.getRefundByIdAdmin
);

/**
 * @route   POST /api/admin/refunds/:refundId/approve
 * @desc    Approve refund
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:refundId/approve",
  authenticateAdmin,
  validate(refundsValidation.approveRefundSchema),
  refundsController.approveRefund
);

/**
 * @route   POST /api/admin/refunds/:refundId/reject
 * @desc    Reject refund
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:refundId/reject",
  authenticateAdmin,
  validate(refundsValidation.rejectRefundSchema),
  refundsController.rejectRefund
);

/**
 * @route   POST /api/admin/refunds/:refundId/process
 * @desc    Process refund
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:refundId/process",
  authenticateAdmin,
  validate(refundsValidation.processRefundSchema),
  refundsController.processRefund
);

/**
 * Export routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
