import mongoose from "mongoose";

const reviewVoteSchema = new mongoose.Schema(
  {
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    voteType: {
      type: String,
      enum: ["helpful", "not_helpful"],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique constraint: one vote per user per review
reviewVoteSchema.index({ review: 1, user: 1 }, { unique: true });

const ReviewVote = mongoose.model("ReviewVote", reviewVoteSchema);

export default ReviewVote;
