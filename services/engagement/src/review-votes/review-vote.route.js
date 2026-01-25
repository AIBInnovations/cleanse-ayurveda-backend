import { Router } from "express";
import {
  voteReview,
  removeVote,
  getVoteStats,
} from "./review-vote.controller.js";
import { validate } from "@shared/middlewares";
import { authenticateUser } from "@shared/auth-middleware";
import { authenticateAdmin } from "@shared/auth-middleware";
import {
  voteReviewSchema,
  removeVoteSchema,
  getVoteStatsSchema,
} from "./review-vote.validation.js";

const consumerRouter = Router();
const adminRouter = Router();

/**
 * Consumer Routes
 */

/**
 * @route POST /api/reviews/:reviewId/vote
 * @description Vote on a review (helpful/not helpful)
 * @access Auth
 */
consumerRouter.post(
  "/:reviewId/vote",
  authenticateUser,
  validate(voteReviewSchema),
  voteReview
);

/**
 * @route DELETE /api/reviews/:reviewId/vote
 * @description Remove vote from a review
 * @access Auth
 */
consumerRouter.delete(
  "/:reviewId/vote",
  authenticateUser,
  validate(removeVoteSchema),
  removeVote
);

/**
 * Admin Routes
 */

// Apply admin authentication to all admin routes
adminRouter.use(authenticateAdmin);

/**
 * @route GET /api/admin/reviews/:reviewId/votes
 * @description Get vote statistics for a review
 * @access Admin
 */
adminRouter.get("/:reviewId/votes", validate(getVoteStatsSchema), getVoteStats);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
