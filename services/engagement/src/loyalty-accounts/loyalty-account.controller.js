import LoyaltyAccount from "../../models/loyalty-account.model.js";
import LoyaltyTransaction from "../../models/loyalty-transaction.model.js";
import LoyaltyTier from "../../models/loyalty-tier.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * Helper to determine tier based on points
 */
const determineTier = async (pointsEarnedLifetime) => {
  const tier = await LoyaltyTier.findOne({
    isActive: true,
    minPoints: { $lte: pointsEarnedLifetime },
  })
    .sort({ minPoints: -1 })
    .select("_id")
    .lean();

  return tier?._id || null;
};

/**
 * @route GET /api/loyalty/account
 * @description Get user's loyalty account (consumer)
 * @access Auth
 */
export const getAccount = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/loyalty/account for user ${userId}`);

  try {
    let account = await LoyaltyAccount.findOne({ user: userId })
      .populate("tier", "name displayName minPoints pointsMultiplier benefits color icon")
      .lean();

    if (!account) {
      // Create account if doesn't exist
      const defaultTier = await LoyaltyTier.findOne({ isActive: true })
        .sort({ minPoints: 1 })
        .select("_id")
        .lean();

      account = new LoyaltyAccount({
        user: userId,
        tier: defaultTier?._id || null,
        pointsBalance: 0,
        pointsEarnedLifetime: 0,
        pointsRedeemedLifetime: 0,
        currentYearSpend: 0,
      });

      await account.save();

      account = await LoyaltyAccount.findById(account._id)
        .populate("tier", "name displayName minPoints pointsMultiplier benefits color icon")
        .lean();
    }

    // Get next tier info
    let nextTier = null;
    let pointsToNextTier = null;

    if (account.tier) {
      nextTier = await LoyaltyTier.findOne({
        isActive: true,
        minPoints: { $gt: account.tier.minPoints },
      })
        .sort({ minPoints: 1 })
        .select("name displayName minPoints color icon")
        .lean();

      if (nextTier) {
        pointsToNextTier = nextTier.minPoints - account.pointsEarnedLifetime;
      }
    }

    console.log(`> Account found for user ${userId}`);
    return sendResponse(res, 200, "Account fetched successfully", {
      account,
      nextTier,
      pointsToNextTier,
    }, null);
  } catch (error) {
    console.log("> Error fetching account:", error.message);
    return sendResponse(res, 500, "Failed to fetch account", null, error.message);
  }
};

/**
 * @route GET /api/loyalty/account/history
 * @description Get user's points history (consumer)
 * @access Auth
 */
export const getAccountHistory = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/loyalty/account/history for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: userId };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find(filter)
        .select("type points balanceAfter referenceType description createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyTransaction.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${transactions.length} transactions for user ${userId}`);
    return sendResponse(res, 200, "History fetched successfully", { transactions, pagination }, null);
  } catch (error) {
    console.log("> Error fetching account history:", error.message);
    return sendResponse(res, 500, "Failed to fetch history", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/accounts
 * @description List all loyalty accounts (admin)
 * @access Admin
 */
export const listAccounts = async (req, res) => {
  console.log("> GET /api/admin/loyalty/accounts");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.tierId) {
      filter.tier = req.query.tierId;
    }

    if (req.query.minBalance !== undefined) {
      filter.pointsBalance = { $gte: parseInt(req.query.minBalance, 10) };
    }

    if (req.query.maxBalance !== undefined) {
      filter.pointsBalance = {
        ...filter.pointsBalance,
        $lte: parseInt(req.query.maxBalance, 10),
      };
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [accounts, total] = await Promise.all([
      LoyaltyAccount.find(filter)
        .populate("user", "firstName lastName email")
        .populate("tier", "name displayName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyAccount.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${accounts.length} of ${total} accounts`);
    return sendResponse(res, 200, "Accounts fetched successfully", { accounts, pagination }, null);
  } catch (error) {
    console.log("> Error fetching accounts:", error.message);
    return sendResponse(res, 500, "Failed to fetch accounts", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/accounts/:userId
 * @description Get account by user ID (admin)
 * @access Admin
 */
export const getAccountByUserId = async (req, res) => {
  const { userId } = req.params;
  console.log(`> GET /api/admin/loyalty/accounts/${userId}`);

  try {
    const account = await LoyaltyAccount.findOne({ user: userId })
      .populate("user", "firstName lastName email phone")
      .populate("tier", "name displayName minPoints pointsMultiplier")
      .lean();

    if (!account) {
      console.log(`> Account not found for user: ${userId}`);
      return sendResponse(res, 404, "Account not found", null, `No loyalty account found for user '${userId}'`);
    }

    // Get recent transactions
    const recentTransactions = await LoyaltyTransaction.find({ user: userId })
      .select("type points balanceAfter referenceType description createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`> Account found for user ${userId}`);
    return sendResponse(res, 200, "Account fetched successfully", {
      account,
      recentTransactions,
    }, null);
  } catch (error) {
    console.log("> Error fetching account:", error.message);
    return sendResponse(res, 500, "Failed to fetch account", null, error.message);
  }
};

/**
 * @route PATCH /api/admin/loyalty/accounts/:userId/adjust
 * @description Adjust points for a user (admin)
 * @access Admin
 */
export const adjustPoints = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.admin._id;
  const { points, description } = req.body;
  console.log(`> PATCH /api/admin/loyalty/accounts/${userId}/adjust`);

  try {
    let account = await LoyaltyAccount.findOne({ user: userId });

    if (!account) {
      // Create account if doesn't exist
      account = new LoyaltyAccount({
        user: userId,
        tier: null,
        pointsBalance: 0,
        pointsEarnedLifetime: 0,
        pointsRedeemedLifetime: 0,
        currentYearSpend: 0,
      });
    }

    const newBalance = account.pointsBalance + points;

    if (newBalance < 0) {
      console.log(`> Cannot adjust: would result in negative balance`);
      return sendResponse(res, 400, "Invalid adjustment", null, "Adjustment would result in negative balance");
    }

    account.pointsBalance = newBalance;
    account.lastActivityAt = new Date();

    if (points > 0) {
      account.pointsEarnedLifetime += points;
    } else {
      account.pointsRedeemedLifetime += Math.abs(points);
    }

    // Update tier based on new lifetime points
    account.tier = await determineTier(account.pointsEarnedLifetime);

    await account.save();

    // Create transaction record
    const transaction = new LoyaltyTransaction({
      user: userId,
      loyaltyAccount: account._id,
      type: "adjust",
      points,
      balanceAfter: newBalance,
      referenceType: "manual",
      description,
      createdBy: adminId,
    });

    await transaction.save();

    console.log(`> Points adjusted for user ${userId}: ${points > 0 ? "+" : ""}${points}`);
    return sendResponse(res, 200, "Points adjusted successfully", {
      account,
      transaction,
    }, null);
  } catch (error) {
    console.log("> Error adjusting points:", error.message);
    return sendResponse(res, 500, "Failed to adjust points", null, error.message);
  }
};

export default {
  getAccount,
  getAccountHistory,
  listAccounts,
  getAccountByUserId,
  adjustPoints,
};
