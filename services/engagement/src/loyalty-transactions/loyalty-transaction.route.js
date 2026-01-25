import { Router } from "express";
import {
  getTransactions,
  listTransactions,
  createManualTransaction,
} from "./loyalty-transaction.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  getTransactionsSchema,
  listTransactionsAdminSchema,
  createManualTransactionSchema,
} from "./loyalty-transaction.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

// All consumer routes require authentication
consumerRouter.use(authenticateUser);

/**
 * @route GET /api/loyalty/transactions
 * @description Get user's transactions
 * @access Auth
 */
consumerRouter.get("/", validate(getTransactionsSchema), getTransactions);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/loyalty/transactions
 * @description List all transactions
 * @access Admin
 */
adminRouter.get("/", validate(listTransactionsAdminSchema), listTransactions);

/**
 * @route POST /api/admin/loyalty/transactions/manual
 * @description Create manual transaction
 * @access Admin
 */
adminRouter.post("/manual", validate(createManualTransactionSchema), createManualTransaction);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
