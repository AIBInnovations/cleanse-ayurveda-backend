import { Router } from "express";
import {
  getAccount,
  getAccountHistory,
  listAccounts,
  getAccountByUserId,
  adjustPoints,
} from "./loyalty-account.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  getAccountSchema,
  getAccountHistorySchema,
  listAccountsAdminSchema,
  getAccountByUserIdSchema,
  adjustPointsSchema,
} from "./loyalty-account.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

// All consumer routes require authentication
consumerRouter.use(authenticateUser);

/**
 * @route GET /api/loyalty/account
 * @description Get user's loyalty account
 * @access Auth
 */
consumerRouter.get("/", validate(getAccountSchema), getAccount);

/**
 * @route GET /api/loyalty/account/history
 * @description Get user's points history
 * @access Auth
 */
consumerRouter.get("/history", validate(getAccountHistorySchema), getAccountHistory);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/loyalty/accounts
 * @description List all loyalty accounts
 * @access Admin
 */
adminRouter.get("/", validate(listAccountsAdminSchema), listAccounts);

/**
 * @route GET /api/admin/loyalty/accounts/:userId
 * @description Get account by user ID
 * @access Admin
 */
adminRouter.get("/:userId", validate(getAccountByUserIdSchema), getAccountByUserId);

/**
 * @route PATCH /api/admin/loyalty/accounts/:userId/adjust
 * @description Adjust points for a user
 * @access Admin
 */
adminRouter.patch("/:userId/adjust", validate(adjustPointsSchema), adjustPoints);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
