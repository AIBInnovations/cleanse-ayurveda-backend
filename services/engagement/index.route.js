import { Router } from "express";
import { sendResponse } from "@shared/utils";
import { route as uploadRoutes } from "@shared/cloudinary";

// Import module routes
import reviewRoutes from "./src/reviews/review.route.js";
import reviewVoteRoutes from "./src/review-votes/review-vote.route.js";
import wishlistRoutes from "./src/wishlists/wishlist.route.js";
import loyaltyTierRoutes from "./src/loyalty-tiers/loyalty-tier.route.js";
import loyaltyAccountRoutes from "./src/loyalty-accounts/loyalty-account.route.js";
import loyaltyTransactionRoutes from "./src/loyalty-transactions/loyalty-transaction.route.js";
import loyaltyRuleRoutes from "./src/loyalty-rules/loyalty-rule.route.js";
import referralRoutes from "./src/referrals/referral.route.js";
import storeCreditRoutes from "./src/store-credits/store-credit.route.js";
import storeCreditTransactionRoutes from "./src/store-credit-transactions/store-credit-transaction.route.js";
import notificationTemplateRoutes from "./src/notification-templates/notification-template.route.js";
import notificationRoutes from "./src/notifications/notification.route.js";

const router = Router();

/**
 * @route GET /api/engagement/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Engagement Service is running", { status: "ok" }, null);
});

/**
 * @route /api/engagement/upload
 * @description Media upload routes
 */
router.use("/upload", uploadRoutes);

// ============================================================
// CONSUMER ROUTES (Public/Auth)
// ============================================================

// Reviews - /products/:productId/reviews
router.use("/products", reviewRoutes.consumer);

// Review Votes - /reviews/:reviewId/vote
router.use("/reviews", reviewVoteRoutes.consumer);

// My Reviews - /my-reviews
router.use("/my-reviews", reviewRoutes.user);

// Wishlist - /wishlist
router.use("/wishlist", wishlistRoutes);

// Loyalty Tiers (public) - /loyalty/tiers
router.use("/loyalty", loyaltyTierRoutes.consumer);

// Loyalty Account (auth) - /loyalty/account
router.use("/loyalty", loyaltyAccountRoutes.consumer);

// Loyalty Transactions (auth) - /loyalty/transactions
router.use("/loyalty", loyaltyTransactionRoutes.consumer);

// Referrals - /referrals
router.use("/referrals", referralRoutes.consumer);

// Store Credits - /store-credits
router.use("/store-credits", storeCreditRoutes.consumer);

// Store Credit Transactions - /store-credits/transactions
router.use("/store-credits", storeCreditTransactionRoutes.consumer);

// Notifications - /notifications
router.use("/notifications", notificationRoutes.consumer);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// Admin Reviews - /admin/reviews
router.use("/admin/reviews", reviewRoutes.admin);

// Admin Review Votes - /admin/reviews/:reviewId/votes
router.use("/admin/reviews", reviewVoteRoutes.admin);

// Admin Loyalty Tiers - /admin/loyalty/tiers
router.use("/admin/loyalty", loyaltyTierRoutes.admin);

// Admin Loyalty Accounts - /admin/loyalty/accounts
router.use("/admin/loyalty", loyaltyAccountRoutes.admin);

// Admin Loyalty Transactions - /admin/loyalty/transactions
router.use("/admin/loyalty", loyaltyTransactionRoutes.admin);

// Admin Loyalty Rules - /admin/loyalty/rules
router.use("/admin/loyalty", loyaltyRuleRoutes.admin);

// Admin Referrals - /admin/referrals
router.use("/admin/referrals", referralRoutes.admin);

// Admin Store Credits - /admin/store-credits
router.use("/admin/store-credits", storeCreditRoutes.admin);

// Admin Store Credit Transactions - /admin/store-credit-transactions
router.use("/admin/store-credit-transactions", storeCreditTransactionRoutes.admin);

// Admin Notification Templates - /admin/notification-templates
router.use("/admin/notification-templates", notificationTemplateRoutes.admin);

// Admin Notifications - /admin/notifications
router.use("/admin/notifications", notificationRoutes.admin);

export default router;
