import StoreCredit from "../../models/store-credit.model.js";
import StoreCreditTransaction from "../../models/store-credit-transaction.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/store-credits/balance
 * @description Get user's store credit balance (consumer)
 * @access Auth
 */
export const getBalance = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/store-credits/balance for user ${userId}`);

  try {
    let storeCredit = await StoreCredit.findOne({ user: userId }).lean();

    if (!storeCredit) {
      // Return zero balance if no record exists
      return sendResponse(res, 200, "Balance fetched successfully", {
        balance: 0,
        currency: "INR",
        lifetimeEarned: 0,
        lifetimeUsed: 0,
      }, null);
    }

    console.log(`> Balance for user ${userId}: ${storeCredit.balance}`);
    return sendResponse(res, 200, "Balance fetched successfully", {
      balance: storeCredit.balance,
      currency: storeCredit.currency,
      lifetimeEarned: storeCredit.lifetimeEarned,
      lifetimeUsed: storeCredit.lifetimeUsed,
    }, null);
  } catch (error) {
    console.log("> Error fetching balance:", error.message);
    return sendResponse(res, 500, "Failed to fetch balance", null, error.message);
  }
};

/**
 * @route GET /api/store-credits/history
 * @description Get user's store credit history (consumer)
 * @access Auth
 */
export const getHistory = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/store-credits/history for user ${userId}`);

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { user: userId };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [transactions, total] = await Promise.all([
      StoreCreditTransaction.find(filter)
        .select("type amount balanceAfter referenceType description createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StoreCreditTransaction.countDocuments(filter),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${transactions.length} transactions for user ${userId}`);
    return sendResponse(res, 200, "History fetched successfully", { transactions, pagination }, null);
  } catch (error) {
    console.log("> Error fetching history:", error.message);
    return sendResponse(res, 500, "Failed to fetch history", null, error.message);
  }
};

/**
 * @route GET /api/admin/store-credits
 * @description List all store credits (admin)
 * @access Admin
 */
export const listStoreCredits = async (req, res) => {
  console.log("> GET /api/admin/store-credits");

  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.minBalance !== undefined) {
      filter.balance = { $gte: parseFloat(req.query.minBalance) };
    }

    if (req.query.maxBalance !== undefined) {
      filter.balance = {
        ...filter.balance,
        $lte: parseFloat(req.query.maxBalance),
      };
    }

    const sortField = req.query.sortBy || "createdAt";
    const sortOrder = req.query.order === "asc" ? 1 : -1;
    const sortOptions = { [sortField]: sortOrder };

    const [storeCredits, total, stats] = await Promise.all([
      StoreCredit.find(filter)
        .populate("user", "firstName lastName email")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      StoreCredit.countDocuments(filter),
      StoreCredit.aggregate([
        {
          $group: {
            _id: null,
            totalBalance: { $sum: "$balance" },
            totalEarned: { $sum: "$lifetimeEarned" },
            totalUsed: { $sum: "$lifetimeUsed" },
            accountCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const overallStats = stats[0] || {
      totalBalance: 0,
      totalEarned: 0,
      totalUsed: 0,
      accountCount: 0,
    };

    const pagination = buildPaginationMeta(total, page, limit);

    console.log(`> Found ${storeCredits.length} of ${total} store credits`);
    return sendResponse(res, 200, "Store credits fetched successfully", {
      storeCredits,
      stats: overallStats,
      pagination,
    }, null);
  } catch (error) {
    console.log("> Error fetching store credits:", error.message);
    return sendResponse(res, 500, "Failed to fetch store credits", null, error.message);
  }
};

/**
 * @route GET /api/admin/store-credits/:userId
 * @description Get store credit by user ID (admin)
 * @access Admin
 */
export const getByUserId = async (req, res) => {
  const { userId } = req.params;
  console.log(`> GET /api/admin/store-credits/${userId}`);

  try {
    const storeCredit = await StoreCredit.findOne({ user: userId })
      .populate("user", "firstName lastName email phone")
      .lean();

    if (!storeCredit) {
      console.log(`> Store credit not found for user: ${userId}`);
      return sendResponse(res, 404, "Store credit not found", null, `No store credit found for user '${userId}'`);
    }

    // Get recent transactions
    const recentTransactions = await StoreCreditTransaction.find({ user: userId })
      .select("type amount balanceAfter referenceType description createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`> Store credit found for user ${userId}`);
    return sendResponse(res, 200, "Store credit fetched successfully", {
      storeCredit,
      recentTransactions,
    }, null);
  } catch (error) {
    console.log("> Error fetching store credit:", error.message);
    return sendResponse(res, 500, "Failed to fetch store credit", null, error.message);
  }
};

/**
 * @route POST /api/admin/store-credits/:userId/credit
 * @description Issue store credit to user (admin)
 * @access Admin
 */
export const issueCredit = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.admin._id;
  const { amount, description, referenceType, referenceId } = req.body;
  console.log(`> POST /api/admin/store-credits/${userId}/credit`);

  try {
    // Get or create store credit account
    let storeCredit = await StoreCredit.findOne({ user: userId });

    if (!storeCredit) {
      storeCredit = new StoreCredit({
        user: userId,
        balance: 0,
        lifetimeEarned: 0,
        lifetimeUsed: 0,
      });
    }

    const newBalance = storeCredit.balance + amount;

    storeCredit.balance = newBalance;
    storeCredit.lifetimeEarned += amount;

    await storeCredit.save();

    // Create transaction
    const transaction = new StoreCreditTransaction({
      user: userId,
      storeCredit: storeCredit._id,
      type: "credit",
      amount,
      balanceAfter: newBalance,
      referenceType: referenceType || "manual",
      referenceId: referenceId || null,
      description,
      createdBy: adminId,
    });

    await transaction.save();

    console.log(`> Credit issued to user ${userId}: +${amount}`);
    return sendResponse(res, 200, "Credit issued successfully", {
      storeCredit,
      transaction,
    }, null);
  } catch (error) {
    console.log("> Error issuing credit:", error.message);
    return sendResponse(res, 500, "Failed to issue credit", null, error.message);
  }
};

/**
 * @route POST /api/admin/store-credits/:userId/debit
 * @description Deduct store credit from user (admin)
 * @access Admin
 */
export const deductCredit = async (req, res) => {
  const { userId } = req.params;
  const adminId = req.admin._id;
  const { amount, description, referenceType, referenceId } = req.body;
  console.log(`> POST /api/admin/store-credits/${userId}/debit`);

  try {
    const storeCredit = await StoreCredit.findOne({ user: userId });

    if (!storeCredit) {
      console.log(`> Store credit not found for user: ${userId}`);
      return sendResponse(res, 404, "Store credit not found", null, `No store credit found for user '${userId}'`);
    }

    if (storeCredit.balance < amount) {
      console.log(`> Insufficient balance: ${storeCredit.balance} < ${amount}`);
      return sendResponse(res, 400, "Insufficient balance", null, `User only has ${storeCredit.balance} credits available`);
    }

    const newBalance = storeCredit.balance - amount;

    storeCredit.balance = newBalance;
    storeCredit.lifetimeUsed += amount;

    await storeCredit.save();

    // Create transaction
    const transaction = new StoreCreditTransaction({
      user: userId,
      storeCredit: storeCredit._id,
      type: "debit",
      amount,
      balanceAfter: newBalance,
      referenceType: referenceType || "manual",
      referenceId: referenceId || null,
      description,
      createdBy: adminId,
    });

    await transaction.save();

    console.log(`> Credit deducted from user ${userId}: -${amount}`);
    return sendResponse(res, 200, "Credit deducted successfully", {
      storeCredit,
      transaction,
    }, null);
  } catch (error) {
    console.log("> Error deducting credit:", error.message);
    return sendResponse(res, 500, "Failed to deduct credit", null, error.message);
  }
};

export default {
  getBalance,
  getHistory,
  listStoreCredits,
  getByUserId,
  issueCredit,
  deductCredit,
};
