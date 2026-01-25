import StoreCreditTransaction from "../../models/store-credit-transaction.model.js";
import { sendResponse } from "@shared/utils";
import { parsePagination, buildPaginationMeta } from "../../services/pagination.service.js";

/**
 * @route GET /api/store-credits/transactions
 * @description Get user's store credit transactions (consumer)
 * @access Auth
 */
export const getTransactions = async (req, res) => {
  const userId = req.user._id;
  console.log(`> GET /api/store-credits/transactions for user ${userId}`);

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
    return sendResponse(res, 200, "Transactions fetched successfully", { transactions, pagination }, null);
  } catch (error) {
    console.log("> Error fetching transactions:", error.message);
    return sendResponse(res, 500, "Failed to fetch transactions", null, error.message);
  }
};

/**
 * @route GET /api/admin/store-credit-transactions
 * @description List all store credit transactions (admin)
 * @access Admin
 */
export const listTransactions = async (req, res) => {
  console.log("> GET /api/admin/store-credit-transactions");

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
      StoreCreditTransaction.find(filter)
        .populate("user", "firstName lastName email")
        .populate("createdBy", "firstName lastName")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      StoreCreditTransaction.countDocuments(filter),
      StoreCreditTransaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$type",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const transactionStats = {
      credit: { count: 0, totalAmount: 0 },
      debit: { count: 0, totalAmount: 0 },
    };

    stats.forEach((stat) => {
      transactionStats[stat._id] = {
        count: stat.count,
        totalAmount: stat.totalAmount,
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

export default {
  getTransactions,
  listTransactions,
};
