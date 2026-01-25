import LoyaltyTransaction from "../../models/loyalty-transaction.model.js";
import LoyaltyAccount from "../../models/loyalty-account.model.js";
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
 * @route GET /api/loyalty/transactions
 * @description Get user's transactions (consumer)
 * @access Auth
 */
export const getTransactions = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/loyalty/transactions for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: userId };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      LoyaltyTransaction.find(filter)
        .select("type points balanceAfter referenceType description createdAt expiresAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyTransaction.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${transactions.length} transactions for user ${userId}`);
    return sendResponse(res, 200, "Transactions fetched successfully", { transactions, pagination }, null);
  } catch (error) {
    console.log("> Error fetching transactions:", error.message);
    return sendResponse(res, 500, "Failed to fetch transactions", null, error.message);
  }
};

/**
 * @route GET /api/admin/loyalty/transactions
 * @description List all transactions (admin)
 * @access Admin
 */
export const listTransactions = async (req, res) => {
  console.log("> GET /api/admin/loyalty/transactions");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.referenceType) {
      filter.referenceType = req.query.referenceType;
    }

    if (req.query.userId) {
      filter.user = req.query.userId;
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

    const [transactions, total, stats] = await Promise.all([
      LoyaltyTransaction.find(filter)
        .populate("user", "firstName lastName email")
        .populate("createdBy", "firstName lastName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      LoyaltyTransaction.countDocuments(filter),
      LoyaltyTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$type",
            totalPoints: { $sum: "$points" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const transactionStats = {
      earn: { count: 0, totalPoints: 0 },
      redeem: { count: 0, totalPoints: 0 },
      expire: { count: 0, totalPoints: 0 },
      adjust: { count: 0, totalPoints: 0 },
    };

    stats.forEach((stat) => {
      transactionStats[stat._id] = {
        count: stat.count,
        totalPoints: stat.totalPoints,
      };
    });

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${transactions.length} of ${total} transactions`);
    return sendResponse(res, 200, "Transactions fetched successfully", {
      transactions,
      stats: transactionStats,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching transactions:", error.message);
    return sendResponse(res, 500, "Failed to fetch transactions", null, error.message);
  }
};

/**
 * @route POST /api/admin/loyalty/transactions/manual
 * @description Create manual transaction (admin)
 * @access Admin
 */
export const createManualTransaction = async (req, res) => {
  const adminId = req.admin._id;
  const { userId, type, points, description } = req.body;
  console.log("> POST /api/admin/loyalty/transactions/manual");

  try {
    // Get or create account
    let account = await LoyaltyAccount.findOne({ user: userId });

    if (!account) {
      account = new LoyaltyAccount({
        user: userId,
        tier: null,
        pointsBalance: 0,
        pointsEarnedLifetime: 0,
        pointsRedeemedLifetime: 0,
        currentYearSpend: 0,
      });
    }

    // Calculate new balance
    let pointsChange = points;
    if (type === "redeem") {
      pointsChange = -Math.abs(points);
    } else if (type === "earn") {
      pointsChange = Math.abs(points);
    }

    const newBalance = account.pointsBalance + pointsChange;

    if (newBalance < 0) {
      console.log(`> Cannot create transaction: would result in negative balance`);
      return sendResponse(res, 400, "Invalid transaction", null, "Transaction would result in negative balance");
    }

    // Update account
    account.pointsBalance = newBalance;
    account.lastActivityAt = new Date();

    if (pointsChange > 0) {
      account.pointsEarnedLifetime += pointsChange;
    } else {
      account.pointsRedeemedLifetime += Math.abs(pointsChange);
    }

    // Update tier based on new lifetime points
    account.tier = await determineTier(account.pointsEarnedLifetime);

    await account.save();

    // Create transaction
    const transaction = new LoyaltyTransaction({
      user: userId,
      loyaltyAccount: account._id,
      type,
      points: pointsChange,
      balanceAfter: newBalance,
      referenceType: "manual",
      description,
      createdBy: adminId,
    });

    await transaction.save();

    const populatedTransaction = await LoyaltyTransaction.findById(transaction._id)
      .populate("user", "firstName lastName email")
      .populate("createdBy", "firstName lastName")
      .lean();

    console.log(`> Manual transaction created: ${type} ${pointsChange} points for user ${userId}`);
    return sendResponse(res, 201, "Transaction created successfully", {
      transaction: populatedTransaction,
      newBalance,
    }, null);
  } catch (error) {
    console.log("> Error creating transaction:", error.message);
    return sendResponse(res, 500, "Failed to create transaction", null, error.message);
  }
};

export default {
  getTransactions,
  listTransactions,
  createManualTransaction,
};
