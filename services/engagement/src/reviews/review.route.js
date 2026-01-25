import { Router } from "express";
import {
  getProductReviews,
  createReview,
  getMyReviews,
  listReviews,
  getReviewById,
  approveReview,
  rejectReview,
  toggleFeatured,
  addAdminResponse,
  deleteReview,
} from "./review.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser } from "@shared/auth-middleware";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  createReviewSchema,
  getProductReviewsSchema,
  getMyReviewsSchema,
  listReviewsAdminSchema,
  reviewIdParamSchema,
  approveReviewSchema,
  rejectReviewSchema,
  toggleFeaturedSchema,
  adminRespondSchema,
} from "./review.validation.js";

const consumerRouter = Router();
const userRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes - mounted at /products
 */

/**
 * @route GET /api/engagement/products/:productId/reviews
 * @description Get reviews for a product
 * @access Public
 */
consumerRouter.get(
  "/:productId/reviews",
  validate(getProductReviewsSchema),
  getProductReviews
);

/**
 * @route POST /api/engagement/products/:productId/reviews
 * @description Submit a review for a product
 * @access Auth
 */
consumerRouter.post(
  "/:productId/reviews",
  authenticateUser,
  validate(createReviewSchema),
  createReview
);

/**
 * User Routes - mounted at /my-reviews
 */

/**
 * @route GET /api/engagement/my-reviews
 * @description Get user's own reviews
 * @access Auth
 */
userRouter.get(
  "/",
  authenticateUser,
  validate(getMyReviewsSchema),
  getMyReviews
);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/reviews
 * @description List all reviews
 * @access Admin
 */
adminRouter.get("/", validate(listReviewsAdminSchema), listReviews);

/**
 * @route GET /api/admin/reviews/:id
 * @description Get review by ID
 * @access Admin
 */
adminRouter.get("/:id", validate(reviewIdParamSchema), getReviewById);

/**
 * @route PATCH /api/admin/reviews/:id/approve
 * @description Approve a review
 * @access Admin
 */
adminRouter.patch("/:id/approve", validate(approveReviewSchema), approveReview);

/**
 * @route PATCH /api/admin/reviews/:id/reject
 * @description Reject a review
 * @access Admin
 */
adminRouter.patch("/:id/reject", validate(rejectReviewSchema), rejectReview);

/**
 * @route PATCH /api/admin/reviews/:id/feature
 * @description Toggle featured status
 * @access Admin
 */
adminRouter.patch("/:id/feature", validate(toggleFeaturedSchema), toggleFeatured);

/**
 * @route POST /api/admin/reviews/:id/respond
 * @description Add admin response to a review
 * @access Admin
 */
adminRouter.post("/:id/respond", validate(adminRespondSchema), addAdminResponse);

/**
 * @route DELETE /api/admin/reviews/:id
 * @description Delete a review
 * @access Admin
 */
adminRouter.delete("/:id", validate(reviewIdParamSchema), deleteReview);

export default {
  consumer: consumerRouter,
  user: userRouter,
  admin: adminRouter,
};
