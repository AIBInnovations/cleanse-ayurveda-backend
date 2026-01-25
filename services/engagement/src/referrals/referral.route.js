import { Router } from "express";
import {
  getMyCode,
  getMyReferrals,
  applyCode,
  listReferrals,
  getReferralById,
  getReferralStats,
  flagFraud,
} from "./referral.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser, authenticateAdmin } from "@shared/auth-middleware";
import {
  applyCodeSchema,
  getMyReferralsSchema,
  listReferralsAdminSchema,
  referralIdParamSchema,
  flagFraudSchema,
} from "./referral.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route POST /api/referrals/apply
 * @description Apply referral code on signup
 * @access Public
 */
consumerRouter.post("/apply", validate(applyCodeSchema), applyCode);

/**
 * @route GET /api/referrals/my-code
 * @description Get user's referral code
 * @access Auth
 */
consumerRouter.get("/my-code", authenticateUser, getMyCode);

/**
 * @route GET /api/referrals/my-referrals
 * @description Get user's referrals list
 * @access Auth
 */
consumerRouter.get("/my-referrals", authenticateUser, validate(getMyReferralsSchema), getMyReferrals);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/referrals
 * @description List all referrals
 * @access Admin
 */
adminRouter.get("/", validate(listReferralsAdminSchema), listReferrals);

/**
 * @route GET /api/admin/referrals/stats
 * @description Get referral statistics
 * @access Admin
 */
adminRouter.get("/stats", getReferralStats);

/**
 * @route GET /api/admin/referrals/:id
 * @description Get referral details
 * @access Admin
 */
adminRouter.get("/:id", validate(referralIdParamSchema), getReferralById);

/**
 * @route PATCH /api/admin/referrals/:id/flag-fraud
 * @description Flag referral as suspicious
 * @access Admin
 */
adminRouter.patch("/:id/flag-fraud", validate(flagFraudSchema), flagFraud);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
