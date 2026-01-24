import express from "express";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import { validate } from "@shared/middlewares";
import * as invoicesController from "./invoices.controller.js";
import * as invoicesValidation from "./invoices.validation.js";

/**
 * Consumer Invoices Routes
 * Base path: /api/invoices
 */
const consumerRouter = express.Router();

/**
 * @route   GET /api/invoices/:invoiceId
 * @desc    Get invoice by ID
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:invoiceId",
  authenticateUser,
  validate(invoicesValidation.getInvoiceByIdSchema),
  invoicesController.getInvoiceById
);

/**
 * @route   GET /api/invoices/order/:orderId
 * @desc    Get invoice by order ID
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/order/:orderId",
  authenticateUser,
  validate(invoicesValidation.getInvoiceByOrderIdSchema),
  invoicesController.getInvoiceByOrderId
);

/**
 * @route   GET /api/invoices/:invoiceId/download
 * @desc    Download invoice PDF
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/:invoiceId/download",
  authenticateUser,
  validate(invoicesValidation.downloadInvoicePdfSchema),
  invoicesController.downloadInvoicePdf
);

/**
 * @route   GET /api/invoices
 * @desc    Get my invoices
 * @access  Private (Consumer)
 */
consumerRouter.get(
  "/",
  authenticateUser,
  validate(invoicesValidation.getMyInvoicesSchema),
  invoicesController.getMyInvoices
);

/**
 * Admin Invoices Routes
 * Base path: /api/admin/invoices
 */
const adminRouter = express.Router();

/**
 * @route   GET /api/admin/invoices/stats
 * @desc    Get invoice statistics
 * @access  Private (Admin)
 */
adminRouter.get(
  "/stats",
  authenticateAdmin,
  validate(invoicesValidation.getInvoiceStatsSchema),
  invoicesController.getInvoiceStats
);

/**
 * @route   POST /api/admin/invoices/generate/:orderId
 * @desc    Generate invoice for order
 * @access  Private (Admin)
 */
adminRouter.post(
  "/generate/:orderId",
  authenticateAdmin,
  validate(invoicesValidation.generateInvoiceSchema),
  invoicesController.generateInvoice
);

/**
 * @route   GET /api/admin/invoices
 * @desc    Get all invoices with filters
 * @access  Private (Admin)
 */
adminRouter.get(
  "/",
  authenticateAdmin,
  validate(invoicesValidation.getAllInvoicesSchema),
  invoicesController.getAllInvoices
);

/**
 * @route   GET /api/admin/invoices/:invoiceId
 * @desc    Get invoice by ID
 * @access  Private (Admin)
 */
adminRouter.get(
  "/:invoiceId",
  authenticateAdmin,
  validate(invoicesValidation.getInvoiceByIdAdminSchema),
  invoicesController.getInvoiceByIdAdmin
);

/**
 * @route   POST /api/admin/invoices/:invoiceId/send-email
 * @desc    Send invoice email
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:invoiceId/send-email",
  authenticateAdmin,
  validate(invoicesValidation.sendInvoiceEmailSchema),
  invoicesController.sendInvoiceEmail
);

/**
 * @route   POST /api/admin/invoices/:invoiceId/regenerate
 * @desc    Regenerate invoice
 * @access  Private (Admin)
 */
adminRouter.post(
  "/:invoiceId/regenerate",
  authenticateAdmin,
  validate(invoicesValidation.regenerateInvoiceSchema),
  invoicesController.regenerateInvoice
);

/**
 * Export routers using dual export pattern
 */
export const consumer = consumerRouter;
export const admin = adminRouter;
