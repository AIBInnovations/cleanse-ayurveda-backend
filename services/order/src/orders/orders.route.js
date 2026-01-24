import express from "express";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import * as ordersController from "./orders.controller.js";
import * as ordersValidation from "./orders.validation.js";

/**
 * Consumer Orders Routes
 * Base path: /api/orders
 */
const consumerRouter = express.Router();

// Apply user authentication to all consumer routes
consumerRouter.use(authenticateUser);

/**
 * @route   GET /api/orders
 * @desc    Get my orders
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/",
  validate(ordersValidation.getMyOrdersSchema),
  ordersController.getMyOrders
);

/**
 * @route   GET /api/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/number/:orderNumber",
  validate(ordersValidation.getOrderByNumberSchema),
  ordersController.getOrderByNumber
);

/**
 * @route   GET /api/orders/:orderId
 * @desc    Get order by ID
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:orderId",
  validate(ordersValidation.getOrderByIdSchema),
  ordersController.getOrderById
);

/**
 * @route   POST /api/orders/:orderId/cancel
 * @desc    Cancel order
 * @access  Private (Consumer)
 */
consumerRouter.post(
  "/:orderId/cancel",
  validate(ordersValidation.cancelOrderSchema),
  ordersController.cancelOrder
);

/**
 * Admin Orders Routes
 * Base path: /api/admin/orders
 */
const adminRouter = express.Router();

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route   GET /api/admin/orders/stats
 * @desc    Get order statistics
 * @access  Private (Admin)
 */
adminRouter.get(
  "/stats",
  validate(ordersValidation.getOrderStatsSchema),
  ordersController.getOrderStats
);

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with filters
 * @access  Private (Admin)
 */
adminRouter.get(
  "/",
  validate(ordersValidation.getAllOrdersSchema),
  ordersController.getAllOrders
);

/**
 * @route   GET /api/admin/orders/:orderId
 * @desc    Get order by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:orderId",
  validate(ordersValidation.getOrderByIdAdminSchema),
  ordersController.getOrderByIdAdmin
);

/**
 * @route   PUT /api/admin/orders/:orderId/status
 * @desc    Update order status
 * @access  Private (Admin)
 */
adminRouter.put(
  "/:orderId/status",
  validate(ordersValidation.updateOrderStatusSchema),
  ordersController.updateOrderStatus
);

/**
 * @route   PUT /api/admin/orders/:orderId/payment-status
 * @desc    Update payment status
 * @access  Private (Admin)
 */
adminRouter.put(
  "/:orderId/payment-status",
  validate(ordersValidation.updatePaymentStatusSchema),
  ordersController.updatePaymentStatus
);

/**
 * @route   PUT /api/admin/orders/:orderId/fulfillment-status
 * @desc    Update fulfillment status
 * @access  Private (Admin)
 */
adminRouter.put(
  "/:orderId/fulfillment-status",
  validate(ordersValidation.updateFulfillmentStatusSchema),
  ordersController.updateFulfillmentStatus
);

/**
 * @route   POST /api/admin/orders/:orderId/notes
 * @desc    Add notes to order
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:orderId/notes",
  validate(ordersValidation.addOrderNotesSchema),
  ordersController.addOrderNotes
);

/**
 * @route   PATCH /api/admin/orders/bulk/status
 * @desc    Bulk update order status
 * @access  Private (Admin)
 */
adminRouter.patch(
  "/bulk/status",
  validate(ordersValidation.bulkUpdateStatusSchema),
  ordersController.bulkUpdateStatus
);

/**
 * @route   POST /api/admin/orders/bulk/export
 * @desc    Bulk export orders
 * @access  Private (Admin)
 */
adminRouter.post(
  "/bulk/export",
  validate(ordersValidation.bulkExportOrdersSchema),
  ordersController.bulkExportOrders
);

/**
 * Export both routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
