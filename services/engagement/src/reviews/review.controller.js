import Review from "../../models/review.model.js";
import ReviewVote from "../../models/review-vote.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/products/:productId/reviews
 * @description Get reviews for a product (consumer)
 * @access Public
 */
export const getProductReviews = async (req, res) => {
  const { productId } = req.params;
  console.log(`> GET /api/products/${productId}/reviews`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {
      product: productId,
      status: "approved",
    };

    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating, 10);
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [reviews, total, ratingStats] = await Promise.all([
      Review.find(filter)
        .select("rating title content images isVerifiedPurchase isFeatured helpfulCount adminResponse adminResponseAt createdAt")
        .populate("user", "firstName lastName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.aggregate([
        { $match: { product: productId, status: "approved" } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = ratingStats[0] || {
      averageRating: 0,
      totalReviews: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0,
    };

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${reviews.length} reviews for product ${productId}`);
    return sendResponse(res, 200, "Reviews fetched successfully", {
      reviews,
      stats: {
        averageRating: Math.round(stats.averageRating * 10) / 10,
        totalReviews: stats.totalReviews,
        distribution: {
          5: stats.rating5,
          4: stats.rating4,
          3: stats.rating3,
          2: stats.rating2,
          1: stats.rating1,
        },
      },
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching product reviews:", error.message);
    return sendResponse(res, 500, "Failed to fetch reviews", null, error.message);
  }
};

/**
 * @route POST /api/products/:productId/reviews
 * @description Submit a review for a product (consumer)
 * @access Auth
 */
export const createReview = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;
  console.log(`> POST /api/products/${productId}/reviews`);

  try {
    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId,
    });

    if (existingReview) {
      console.log(`> User ${userId} already reviewed product ${productId}`);
      return sendResponse(res, 409, "Review already exists", null, "You have already reviewed this product");
    }

    const { rating, title, content, images, orderId, orderItemId } = req.body;

    // TODO: Verify if user purchased this product (check order service)
    // For now, we'll allow reviews without verified purchase
    const isVerifiedPurchase = !!orderId;

    const review = new Review({
      product: productId,
      user: userId,
      order: orderId || null,
      orderItem: orderItemId || null,
      rating,
      title: title || null,
      content: content || null,
      images: images || [],
      isVerifiedPurchase,
      status: "pending",
    });

    await review.save();

    console.log(`> Review created: ${review._id} for product ${productId}`);
    return sendResponse(res, 201, "Review submitted successfully", { review }, null);
  } catch (error) {
    console.log("> Error creating review:", error.message);

    if (error.code === 11000) {
      return sendResponse(res, 409, "Review already exists", null, "You have already reviewed this product");
    }

    return sendResponse(res, 500, "Failed to submit review", null, error.message);
  }
};

/**
 * @route GET /api/my-reviews
 * @description Get user's own reviews (consumer)
 * @access Auth
 */
export const getMyReviews = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/my-reviews for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: userId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${reviews.length} reviews for user ${userId}`);
    return sendResponse(res, 200, "Reviews fetched successfully", { reviews, pagination }, null);
  } catch (error) {
    console.log("> Error fetching user reviews:", error.message);
    return sendResponse(res, 500, "Failed to fetch reviews", null, error.message);
  }
};

/**
 * @route GET /api/admin/reviews
 * @description List all reviews (admin)
 * @access Admin
 */
export const listReviews = async (req, res) => {
  console.log("> GET /api/admin/reviews");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating, 10);
    }

    if (req.query.isFeatured === "true") {
      filter.isFeatured = true;
    } else if (req.query.isFeatured === "false") {
      filter.isFeatured = false;
    }

    if (req.query.isVerifiedPurchase === "true") {
      filter.isVerifiedPurchase = true;
    } else if (req.query.isVerifiedPurchase === "false") {
      filter.isVerifiedPurchase = false;
    }

    if (req.query.productId) {
      filter.product = req.query.productId;
    }

    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("product", "name slug")
        .populate("user", "firstName lastName email")
        .populate("moderatedBy", "firstName lastName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${reviews.length} of ${total} reviews`);
    return sendResponse(res, 200, "Reviews fetched successfully", { reviews, pagination }, null);
  } catch (error) {
    console.log("> Error fetching reviews:", error.message);
    return sendResponse(res, 500, "Failed to fetch reviews", null, error.message);
  }
};

/**
 * @route GET /api/admin/reviews/:id
 * @description Get review by ID (admin)
 * @access Admin
 */
export const getReviewById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/reviews/${id}`);

  try {
    const review = await Review.findById(id)
      .populate("product", "name slug")
      .populate("user", "firstName lastName email")
      .populate("moderatedBy", "firstName lastName")
      .populate("adminResponseBy", "firstName lastName")
      .lean();

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    // Get vote stats
    const voteStats = await ReviewVote.aggregate([
      { $match: { review: review._id } },
      {
        $group: {
          _id: "$voteType",
          count: { $sum: 1 },
        },
      },
    ]);

    const votes = {
      helpful: 0,
      not_helpful: 0,
    };

    voteStats.forEach((stat) => {
      votes[stat._id] = stat.count;
    });

    console.log(`> Review found: ${id}`);
    return sendResponse(res, 200, "Review fetched successfully", { review, votes }, null);
  } catch (error) {
    console.log("> Error fetching review:", error.message);
    return sendResponse(res, 500, "Failed to fetch review", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/reviews/:id/approve
 * @description Approve a review (admin)
 * @access Admin
 */
export const approveReview = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin._id;
  console.log(`> PATCH /api/admin/reviews/${id}/approve`);

  try {
    const review = await Review.findById(id);

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    review.status = "approved";
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();
    review.rejectionReason = null;

    await review.save();

    // TODO: Update product rating summary in catalog service

    console.log(`> Review approved: ${id}`);
    return sendResponse(res, 200, "Review approved successfully", { review }, null);
  } catch (error) {
    console.log("> Error approving review:", error.message);
    return sendResponse(res, 500, "Failed to approve review", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/reviews/:id/reject
 * @description Reject a review (admin)
 * @access Admin
 */
export const rejectReview = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin._id;
  const { reason } = req.body;
  console.log(`> PATCH /api/admin/reviews/${id}/reject`);

  try {
    const review = await Review.findById(id);

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    review.status = "rejected";
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();
    review.rejectionReason = reason || null;

    await review.save();

    console.log(`> Review rejected: ${id}`);
    return sendResponse(res, 200, "Review rejected successfully", { review }, null);
  } catch (error) {
    console.log("> Error rejecting review:", error.message);
    return sendResponse(res, 500, "Failed to reject review", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/reviews/:id/feature
 * @description Toggle featured status (admin)
 * @access Admin
 */
export const toggleFeatured = async (req, res) => {
  const { id } = req.params;
  const { isFeatured } = req.body;
  console.log(`> PATCH /api/admin/reviews/${id}/feature`);

  try {
    const review = await Review.findById(id);

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    review.isFeatured = isFeatured;
    await review.save();

    console.log(`> Review featured status updated: ${id} -> ${isFeatured}`);
    return sendResponse(res, 200, "Review featured status updated successfully", { review }, null);
  } catch (error) {
    console.log("> Error updating review featured status:", error.message);
    return sendResponse(res, 500, "Failed to update review", null, error.message);
  }
};

/**
 * @route POST /api/admin/reviews/:id/respond
 * @description Add admin response to a review (admin)
 * @access Admin
 */
export const addAdminResponse = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin._id;
  const { response } = req.body;
  console.log(`> POST /api/admin/reviews/${id}/respond`);

  try {
    const review = await Review.findById(id);

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    review.adminResponse = response;
    review.adminResponseBy = adminId;
    review.adminResponseAt = new Date();

    await review.save();

    console.log(`> Admin response added to review: ${id}`);
    return sendResponse(res, 200, "Response added successfully", { review }, null);
  } catch (error) {
    console.log("> Error adding admin response:", error.message);
    return sendResponse(res, 500, "Failed to add response", null, error.message);
  }
};

/**
 * @route DELETE /api/admin/reviews/:id
 * @description Delete a review (admin)
 * @access Admin
 */
export const deleteReview = async (req, res) => {
  const { id } = req.params;
  console.log(`> DELETE /api/admin/reviews/${id}`);

  try {
    const review = await Review.findById(id);

    if (!review) {
      console.log(`> Review not found: ${id}`);
      return sendResponse(res, 404, "Review not found", null, `Review with ID '${id}' not found`);
    }

    // Delete associated votes
    await ReviewVote.deleteMany({ review: id });

    // Delete the review
    await Review.findByIdAndDelete(id);

    // TODO: Update product rating summary in catalog service

    console.log(`> Review deleted: ${id}`);
    return sendResponse(res, 200, "Review deleted successfully", null, null);
  } catch (error) {
    console.log("> Error deleting review:", error.message);
    return sendResponse(res, 500, "Failed to delete review", null, error.message);
  }
};

export default {
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
};
