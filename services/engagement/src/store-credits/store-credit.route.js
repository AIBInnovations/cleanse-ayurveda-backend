import { Router } from "express";
import {
  getBalance,
  getHistory,
  listStoreCredits,
  getByUserId,
  issueCredit,
  deductCredit,
} from "./store-credit.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  getBalanceSchema,
  getHistorySchema,
  listStoreCreditsAdminSchema,
  getByUserIdSchema,
  issueCreditSchema,
  deductCreditSchema,
} from "./store-credit.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

// All consumer routes require authentication
consumerRouter.use(authenticateUser);

/**
 * @route GET /api/store-credits/balance
 * @description Get user's store credit balance
 * @access Auth
 */
consumerRouter.get("/balance", validate(getBalanceSchema), getBalance);

/**
 * @route GET /api/store-credits/history
 * @description Get user's store credit history
 * @access Auth
 */
consumerRouter.get("/history", validate(getHistorySchema), getHistory);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/store-credits
 * @description List all store credits
 * @access Admin
 */
adminRouter.get("/", validate(listStoreCreditsAdminSchema), listStoreCredits);

/**
 * @route GET /api/admin/store-credits/:userId
 * @description Get store credit by user ID
 * @access Admin
 */
adminRouter.get("/:userId", validate(getByUserIdSchema), getByUserId);

/**
 * @route POST /api/admin/store-credits/:userId/credit
 * @description Issue store credit to user
 * @access Admin
 */
adminRouter.post("/:userId/credit", validate(issueCreditSchema), issueCredit);

/**
 * @route POST /api/admin/store-credits/:userId/debit
 * @description Deduct store credit from user
 * @access Admin
 */
adminRouter.post("/:userId/debit", validate(deductCreditSchema), deductCredit);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
