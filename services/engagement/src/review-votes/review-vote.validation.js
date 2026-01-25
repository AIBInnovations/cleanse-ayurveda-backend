import Joi from "joi";

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

/**
 * Validation schema for voting on a review
 * POST /api/reviews/:reviewId/vote
 */
export const voteReviewSchema = {
  params: Joi.object({
    reviewId: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
  body: Joi.object({
    voteType: Joi.string().valid("helpful", "not_helpful").required().messages({
      "any.only": "Vote type must be 'helpful' or 'not_helpful'",
      "any.required": "Vote type is required",
    }),
  }),
};

/**
 * Validation schema for removing vote
 * DELETE /api/reviews/:reviewId/vote
 */
export const removeVoteSchema = {
  params: Joi.object({
    reviewId: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
};

/**
 * Validation schema for getting vote stats (admin)
 * GET /api/admin/reviews/:reviewId/votes
 */
export const getVoteStatsSchema = {
  params: Joi.object({
    reviewId: objectId.required().messages({
      "string.pattern.base": "Invalid review ID format",
      "any.required": "Review ID is required",
    }),
  }),
};

export default {
  voteReviewSchema,
  removeVoteSchema,
  getVoteStatsSchema,
};
