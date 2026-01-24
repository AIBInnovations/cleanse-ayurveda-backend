import { sendResponse, HTTP_STATUS } from "@shared/utils";
import mongoose from "mongoose";

/**
 * Idempotency Key Schema for tracking request processing
 */
const idempotencySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ["processing", "completed", "failed"], default: "processing" },
  response: { type: mongoose.Schema.Types.Mixed },
  statusCode: { type: Number },
  createdAt: { type: Date, default: Date.now, index: true, expires: 86400 }
});

const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencySchema);

/**
 * Middleware to handle idempotent requests
 * Prevents duplicate payment and order processing
 */
export const handleIdempotency = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers["idempotency-key"];

    if (!idempotencyKey) {
      console.log("> No idempotency key provided");
      return next();
    }

    console.log("> Checking idempotency key:", idempotencyKey);

    const existingRequest = await IdempotencyKey.findOne({ key: idempotencyKey });

    if (existingRequest) {
      if (existingRequest.status === "processing") {
        console.log("> Request is currently being processed");
        return sendResponse(
          res,
          HTTP_STATUS.CONFLICT,
          "Request is currently being processed",
          null,
          null
        );
      }

      if (existingRequest.status === "completed") {
        console.log("> Returning cached response for idempotent request");
        return res.status(existingRequest.statusCode).json(existingRequest.response);
      }

      if (existingRequest.status === "failed") {
        console.log("> Previous request failed, allowing retry");
        await IdempotencyKey.deleteOne({ key: idempotencyKey });
      }
    }

    await IdempotencyKey.create({
      key: idempotencyKey,
      status: "processing"
    });

    const originalJson = res.json.bind(res);

    res.json = async function (data) {
      try {
        await IdempotencyKey.findOneAndUpdate(
          { key: idempotencyKey },
          {
            status: "completed",
            response: data,
            statusCode: res.statusCode
          }
        );
      } catch (error) {
        console.log("> Error saving idempotency response:", error.message);
      }

      return originalJson(data);
    };

    const originalSend = res.send.bind(res);

    res.send = async function (data) {
      try {
        if (res.statusCode >= 400) {
          await IdempotencyKey.findOneAndUpdate(
            { key: idempotencyKey },
            { status: "failed" }
          );
        }
      } catch (error) {
        console.log("> Error updating idempotency status:", error.message);
      }

      return originalSend(data);
    };

    next();
  } catch (error) {
    if (error.code === 11000) {
      console.log("> Duplicate idempotency key detected");
      return sendResponse(
        res,
        HTTP_STATUS.CONFLICT,
        "Request is currently being processed",
        null,
        null
      );
    }

    console.log("> Error handling idempotency:", error.message);
    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to handle request idempotency",
      null,
      error.message
    );
  }
};

/**
 * Generate idempotency key for client-side use
 * @param {string} userId - User ID
 * @param {string} operation - Operation type
 * @returns {string} Idempotency key
 */
export const generateIdempotencyKey = (userId, operation) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${operation}-${userId}-${timestamp}-${random}`;
};

/**
 * Cleanup expired idempotency keys
 * Should be run periodically via cron job
 */
export const cleanupExpiredKeys = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await IdempotencyKey.deleteMany({
      createdAt: { $lt: oneDayAgo }
    });
    console.log(`> Cleaned up ${result.deletedCount} expired idempotency keys`);
    return result.deletedCount;
  } catch (error) {
    console.log("> Error cleaning up idempotency keys:", error.message);
    return 0;
  }
};

/**
 * Get idempotency key statistics
 * @returns {Promise<Object>} Statistics
 */
export const getIdempotencyStats = async () => {
  try {
    const total = await IdempotencyKey.countDocuments();
    const processing = await IdempotencyKey.countDocuments({ status: "processing" });
    const completed = await IdempotencyKey.countDocuments({ status: "completed" });
    const failed = await IdempotencyKey.countDocuments({ status: "failed" });

    return {
      total,
      processing,
      completed,
      failed
    };
  } catch (error) {
    console.log("> Error getting idempotency stats:", error.message);
    return null;
  }
};

export default IdempotencyKey;
