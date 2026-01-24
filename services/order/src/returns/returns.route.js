import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import * as returnsController from "./returns.controller.js";
import * as returnsValidation from "./returns.validation.js";

/**
 * Consumer Returns Routes
 * Base path: /api/returns
 */
const consumerRouter = express.Router();

/**
 * @route   POST /api/returns
 * @desc    Request a return
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/",
  authenticateUser,
  validate(returnsValidation.requestReturnSchema),
  returnsController.requestReturn
);

/**
 * @route   GET /api/returns
 * @desc    Get my returns
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/",
  authenticateUser,
  validate(returnsValidation.getMyReturnsSchema),
  returnsController.getMyReturns
);

/**
 * @route   GET /api/returns/:returnId
 * @desc    Get return by ID
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:returnId",
  authenticateUser,
  validate(returnsValidation.getReturnByIdSchema),
  returnsController.getReturnById
);

/**
 * @route   POST /api/returns/:returnId/cancel
 * @desc    Cancel return request
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/:returnId/cancel",
  authenticateUser,
  validate(returnsValidation.cancelReturnSchema),
  returnsController.cancelReturn
);

/**
 * Admin Returns Routes
 * Base path: /api/admin/returns
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/returns/stats
 * @desc    Get return statistics
 * @access  Private (Admin)
 */
adminRouter.get(
  "/stats",
  authenticateAdmin,
  validate(returnsValidation.getReturnStatsSchema),
  returnsController.getReturnStats
);

/**
 * @route   GET /api/admin/returns
 * @desc    Get all returns with filters
 * @access  Private (Admin)
 */
adminRouter.get(
  "/",
  authenticateAdmin,
  validate(returnsValidation.getAllReturnsSchema),
  returnsController.getAllReturns
);

/**
 * @route   GET /api/admin/returns/:returnId
 * @desc    Get return by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:returnId",
  authenticateAdmin,
  validate(returnsValidation.getReturnByIdAdminSchema),
  returnsController.getReturnByIdAdmin
);

/**
 * @route   POST /api/admin/returns/:returnId/approve
 * @desc    Approve return
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:returnId/approve",
  authenticateAdmin,
  validate(returnsValidation.approveReturnSchema),
  returnsController.approveReturn
);

/**
 * @route   POST /api/admin/returns/:returnId/reject
 * @desc    Reject return
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:returnId/reject",
  authenticateAdmin,
  validate(returnsValidation.rejectReturnSchema),
  returnsController.rejectReturn
);

/**
 * @route   POST /api/admin/returns/:returnId/schedule-pickup
 * @desc    Schedule pickup for return
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:returnId/schedule-pickup",
  authenticateAdmin,
  validate(returnsValidation.schedulePickupSchema),
  returnsController.schedulePickup
);

/**
 * @route   POST /api/admin/returns/:returnId/confirm-pickup
 * @desc    Confirm pickup completion
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:returnId/confirm-pickup",
  authenticateAdmin,
  validate(returnsValidation.confirmPickupSchema),
  returnsController.confirmPickup
);

/**
 * @route   POST /api/admin/returns/:returnId/inspect
 * @desc    Inspect returned items
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:returnId/inspect",
  authenticateAdmin,
  validate(returnsValidation.inspectReturnSchema),
  returnsController.inspectReturn
);

/**
 * Export routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
