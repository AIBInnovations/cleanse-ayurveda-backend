import Referral from "../../models/referral.model.js";
import { getOrCreateReferralCode, validateReferralCode } from "../../services/referral.service.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/referrals/my-code
 * @description Get user's referral code (consumer)
 * @access Auth
 */
export const getMyCode = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/referrals/my-code for user ${userId}`);

  try {
    const { code, isNew } = await getOrCreateReferralCode(userId);

    // Get referral stats
    const stats = await Referral.aggregate([
      { $match: { referrer: userId, referee: { $ne: null } } },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          converted: { $sum: { $cond: [{ $eq: ["$status", "converted"] }, 1, 0] } },
          rewarded: { $sum: { $cond: [{ $eq: ["$status", "rewarded"] }, 1, 0] } },
          totalPointsEarned: { $sum: "$referrerRewardPoints" },
        },
      },
    ]);

    const referralStats = stats[0] || {
      totalReferrals: 0,
      converted: 0,
      rewarded: 0,
      totalPointsEarned: 0,
    };

    console.log(`> Referral code: ${code}, isNew: ${isNew}`);
    return sendResponse(res, 200, "Referral code fetched successfully", {
      code,
      stats: referralStats,
    }, null);
  } catch (error) {
    console.log("> Error fetching referral code:", error.message);
    return sendResponse(res, 500, "Failed to fetch referral code", null, error.message);
  }
};

/**
 * @route GET /api/referrals/my-referrals
 * @description Get user's referrals list (consumer)
 * @access Auth
 */
export const getMyReferrals = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/referrals/my-referrals for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { referrer: userId, referee: { $ne: null } };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [referrals, total] = await Promise.all([
      Referral.find(filter)
        .populate("referee", "firstName lastName")
        .select("referee status refereeRewardPoints referrerRewardPoints rewardsIssued createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${referrals.length} referrals for user ${userId}`);
    return sendResponse(res, 200, "Referrals fetched successfully", { referrals, pagination }, null);
  } catch (error) {
    console.log("> Error fetching referrals:", error.message);
    return sendResponse(res, 500, "Failed to fetch referrals", null, error.message);
  }
};

/**
 * @route POST /api/referrals/apply
 * @description Apply referral code on signup (public)
 * @access Public
 */
export const applyCode = async (req, res) => {
  const { code, email } = req.body;
  console.log(`> POST /api/referrals/apply: ${code} for ${email}`);

  try {
    const validation = await validateReferralCode(code);

    if (!validation.valid) {
      console.log(`> Invalid referral code: ${code}`);
      return sendResponse(res, 400, "Invalid referral code", null, validation.message);
    }

    // Check if this email already used a referral
    const existingReferral = await Referral.findOne({ refereeEmail: email });
    if (existingReferral) {
      console.log(`> Email ${email} already used a referral`);
      return sendResponse(res, 400, "Referral already applied", null, "This email has already used a referral code");
    }

    // Create a pending referral record for this email
    const referral = new Referral({
      referrer: validation.referrerId,
      referrerCode: code.toUpperCase(),
      refereeEmail: email,
      status: "pending",
    });

    await referral.save();

    console.log(`> Referral code applied: ${code} for ${email}`);
    return sendResponse(res, 200, "Referral code applied successfully", {
      referrerName: validation.referrerName,
      message: "Complete your signup to activate the referral",
    }, null);
  } catch (error) {
    console.log("> Error applying referral code:", error.message);
    return sendResponse(res, 500, "Failed to apply referral code", null, error.message);
  }
};

/**
 * @route GET /api/admin/referrals
 * @description List all referrals (admin)
 * @access Admin
 */
export const listReferrals = async (req, res) => {
  console.log("> GET /api/admin/referrals");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.referrerId) {
      filter.referrer = req.query.referrerId;
    }

    if (req.query.isFlagged === "true") {
      filter.isFlagged = true;
    } else if (req.query.isFlagged === "false") {
      filter.isFlagged = false;
    }

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [referrals, total, stats] = await Promise.all([
      Referral.find(filter)
        .populate("referrer", "firstName lastName email")
        .populate("referee", "firstName lastName email")
        .populate("flaggedBy", "firstName lastName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments(filter),
      Referral.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalReferrerPoints: { $sum: "$referrerRewardPoints" },
            totalRefereePoints: { $sum: "$refereeRewardPoints" },
          },
        },
      ]),
    ]);

    const statusStats = {
      pending: { count: 0, referrerPoints: 0, refereePoints: 0 },
      signed_up: { count: 0, referrerPoints: 0, refereePoints: 0 },
      converted: { count: 0, referrerPoints: 0, refereePoints: 0 },
      rewarded: { count: 0, referrerPoints: 0, refereePoints: 0 },
    };

    stats.forEach((stat) => {
      statusStats[stat._id] = {
        count: stat.count,
        referrerPoints: stat.totalReferrerPoints,
        refereePoints: stat.totalRefereePoints,
      };
    });

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${referrals.length} of ${total} referrals`);
    return sendResponse(res, 200, "Referrals fetched successfully", {
      referrals,
      stats: statusStats,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching referrals:", error.message);
    return sendResponse(res, 500, "Failed to fetch referrals", null, error.message);
  }
};

/**
 * @route GET /api/admin/referrals/:id
 * @description Get referral details (admin)
 * @access Admin
 */
export const getReferralById = async (req, res) => {
  const { id } = req.params;
  console.log(`> GET /api/admin/referrals/${id}`);

  try {
    const referral = await Referral.findById(id)
      .populate("referrer", "firstName lastName email phone")
      .populate("referee", "firstName lastName email phone")
      .populate("flaggedBy", "firstName lastName")
      .lean();

    if (!referral) {
      console.log(`> Referral not found: ${id}`);
      return sendResponse(res, 404, "Referral not found", null, `Referral with ID '${id}' not found`);
    }

    console.log(`> Referral found: ${id}`);
    return sendResponse(res, 200, "Referral fetched successfully", { referral }, null);
  } catch (error) {
    console.log("> Error fetching referral:", error.message);
    return sendResponse(res, 500, "Failed to fetch referral", null, error.message);
  }
};

/**
 * @route GET /api/admin/referrals/stats
 * @description Get referral statistics (admin)
 * @access Admin
 */
export const getReferralStats = async (req, res) => {
  console.log("> GET /api/admin/referrals/stats");

  try {
    const [overallStats, monthlyStats] = await Promise.all([
      Referral.aggregate([
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            signedUp: { $sum: { $cond: [{ $in: ["$status", ["signed_up", "converted", "rewarded"]] }, 1, 0] } },
            converted: { $sum: { $cond: [{ $in: ["$status", ["converted", "rewarded"]] }, 1, 0] } },
            rewarded: { $sum: { $cond: [{ $eq: ["$status", "rewarded"] }, 1, 0] } },
            flagged: { $sum: { $cond: ["$isFlagged", 1, 0] } },
            totalReferrerPoints: { $sum: "$referrerRewardPoints" },
            totalRefereePoints: { $sum: "$refereeRewardPoints" },
          },
        },
      ]),
      Referral.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
            converted: { $sum: { $cond: [{ $in: ["$status", ["converted", "rewarded"]] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const stats = overallStats[0] || {
      totalReferrals: 0,
      signedUp: 0,
      converted: 0,
      rewarded: 0,
      flagged: 0,
      totalReferrerPoints: 0,
      totalRefereePoints: 0,
    };

    // Calculate conversion rate
    stats.conversionRate = stats.totalReferrals > 0
      ? Math.round((stats.converted / stats.totalReferrals) * 100)
      : 0;

    console.log(`> Referral stats fetched`);
    return sendResponse(res, 200, "Statistics fetched successfully", {
      overall: stats,
      monthly: monthlyStats,
    }, null);
  } catch (error) {
    console.log("> Error fetching referral stats:", error.message);
    return sendResponse(res, 500, "Failed to fetch statistics", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/referrals/:id/flag-fraud
 * @description Flag referral as suspicious (admin)
 * @access Admin
 */
export const flagFraud = async (req, res) => {
  const { id } = req.params;
  const adminId = req.admin._id;
  const { reason } = req.body;
  console.log(`> PATCH /api/admin/referrals/${id}/flag-fraud`);

  try {
    const referral = await Referral.findById(id);

    if (!referral) {
      console.log(`> Referral not found: ${id}`);
      return sendResponse(res, 404, "Referral not found", null, `Referral with ID '${id}' not found`);
    }

    referral.isFlagged = true;
    referral.flagReason = reason;
    referral.flaggedBy = adminId;
    referral.flaggedAt = new Date();

    await referral.save();

    console.log(`> Referral flagged: ${id}`);
    return sendResponse(res, 200, "Referral flagged successfully", { referral }, null);
  } catch (error) {
    console.log("> Error flagging referral:", error.message);
    return sendResponse(res, 500, "Failed to flag referral", null, error.message);
  }
};

export default {
  getMyCode,
  getMyReferrals,
  applyCode,
  listReferrals,
  getReferralById,
  getReferralStats,
  flagFraud,
};
