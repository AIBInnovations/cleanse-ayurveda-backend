import ReviewVote from "../../models/review-vote.model.js";
import Review from "../../models/review.model.js";
import { sendResponse } from "@shared/utils";

/**
 * @route POST /api/reviews/:reviewId/vote
 * @description Vote on a review (helpful/not helpful)
 * @access Auth
 */
export const voteReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  const { voteType } = req.body;
  console.log(`> POST /api/reviews/${reviewId}/vote`);

  try {
    // Check if review exists and is approved
    const review = await Review.findOne({
      _id: reviewId,
      status: "approved",
    });

    if (!review) {
      console.log(`> Review not found or not approved: ${reviewId}`);
      return sendResponse(res, 404, "Review not found", null, "Review not found or not approved");
    }

    // Check if user already voted
    const existingVote = await ReviewVote.findOne({
      review: reviewId,
      user: userId,
    });

    if (existingVote) {
      // Update existing vote
      const oldVoteType = existingVote.voteType;
      existingVote.voteType = voteType;
      await existingVote.save();

      // Update helpful count if vote type changed
      if (oldVoteType !== voteType) {
        if (voteType === "helpful") {
          await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: 1 } });
        } else {
          await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: -1 } });
        }
      }

      console.log(`> Vote updated: ${reviewId} -> ${voteType}`);
      return sendResponse(res, 200, "Vote updated successfully", { vote: existingVote }, null);
    }

    // Create new vote
    const vote = new ReviewVote({
      review: reviewId,
      user: userId,
      voteType,
    });

    await vote.save();

    // Update helpful count
    if (voteType === "helpful") {
      await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: 1 } });
    }

    console.log(`> Vote created: ${reviewId} -> ${voteType}`);
    return sendResponse(res, 201, "Vote recorded successfully", { vote }, null);
  } catch (error) {
    console.log("> Error voting on review:", error.message);

    if (error.code === 11000) {
      return sendResponse(res, 409, "Vote already exists", null, "You have already voted on this review");
    }

    return sendResponse(res, 500, "Failed to vote on review", null, error.message);
  }
};

/**
 * @route DELETE /api/reviews/:reviewId/vote
 * @description Remove vote from a review
 * @access Auth
 */
export const removeVote = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user._id;
  console.log(`> DELETE /api/reviews/${reviewId}/vote`);

  try {
    const vote = await ReviewVote.findOneAndDelete({
      review: reviewId,
      user: userId,
    });

    if (!vote) {
      console.log(`> Vote not found for review ${reviewId} by user ${userId}`);
      return sendResponse(res, 404, "Vote not found", null, "You have not voted on this review");
    }

    // Update helpful count if it was a helpful vote
    if (vote.voteType === "helpful") {
      await Review.findByIdAndUpdate(reviewId, { $inc: { helpfulCount: -1 } });
    }

    console.log(`> Vote removed: ${reviewId}`);
    return sendResponse(res, 200, "Vote removed successfully", null, null);
  } catch (error) {
    console.log("> Error removing vote:", error.message);
    return sendResponse(res, 500, "Failed to remove vote", null, error.message);
  }
};

/**
 * @route GET /api/admin/reviews/:reviewId/votes
 * @description Get vote statistics for a review (admin)
 * @access Admin
 */
export const getVoteStats = async (req, res) => {
  const { reviewId } = req.params;
  console.log(`> GET /api/admin/reviews/${reviewId}/votes`);

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      console.log(`> Review not found: ${reviewId}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${reviewId}' not found`);
    }

    const [stats, recentVotes] = await Promise.all([
      ReviewVote.aggregate([
        { $match: { review: review._id } },
        {
          $group: {
            _id: "$voteType",
            count: { $sum: 1 },
          },
        },
      ]),
      ReviewVote.find({ review: reviewId })
        .populate("user", "firstName lastName email")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    const voteStats = {
      helpful: 0,
      not_helpful: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      voteStats[stat._id] = stat.count;
      voteStats.total += stat.count;
    });

    console.log(`> Vote stats for review ${reviewId}: ${JSON.stringify(voteStats)}`);
    return sendResponse(res, 200, "Vote statistics fetched successfully", {
      stats: voteStats,
      recentVotes,
    }, null);
  } catch (error) {
    console.log("> Error fetching vote stats:", error.message);
    return sendResponse(res, 500, "Failed to fetch vote statistics", null, error.message);
  }
};

export default {
  voteReview,
  removeVote,
  getVoteStats,
};
