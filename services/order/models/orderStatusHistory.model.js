import mongoose from "mongoose";
import { STATUS_TYPE, CHANGED_BY_TYPE } from "../utils/constants.js";

const orderStatusHistorySchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    fromStatus: {
      type: String,
      trim: true
    },
    toStatus: {
      type: String,
      required: true,
      trim: true
    },
    statusType: {
      type: String,
      enum: Object.values(STATUS_TYPE),
      required: true,
      index: true
    },
    notes: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    changedByType: {
      type: String,
      enum: Object.values(CHANGED_BY_TYPE),
      required: true,
      index: true
    },
    changedById: {
      type: String,
      sparse: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    versionKey: false
  }
);

// Indexes
orderStatusHistorySchema.index({ orderId: 1, createdAt: -1 });
orderStatusHistorySchema.index({ orderId: 1, statusType: 1 });

const OrderStatusHistory = mongoose.model("OrderStatusHistory", orderStatusHistorySchema);

export default OrderStatusHistory;
