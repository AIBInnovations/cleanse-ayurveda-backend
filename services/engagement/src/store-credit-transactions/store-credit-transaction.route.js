import { Router } from "express";
import {
  getTransactions,
  listTransactions,
} from "./store-credit-transaction.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  getTransactionsSchema,
  listTransactionsAdminSchema,
} from "./store-credit-transaction.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

// All consumer routes require authentication
consumerRouter.use(authenticateUser);

/**
 * @route GET /api/store-credits/transactions
 * @description Get user's store credit transactions
 * @access Auth
 */
consumerRouter.get("/", validate(getTransactionsSchema), getTransactions);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/store-credit-transactions
 * @description List all store credit transactions
 * @access Admin
 */
adminRouter.get("/", validate(listTransactionsAdminSchema), listTransactions);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
