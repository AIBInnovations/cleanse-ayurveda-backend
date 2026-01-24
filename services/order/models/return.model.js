import mongoose from "mongoose";
import { RETURN_STATUS, RETURN_REASON } from "../utils/constants.js";

const returnSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(RETURN_STATUS),
      default: RETURN_STATUS.REQUESTED,
      index: true
    },
    reason: {
      type: String,
      enum: Object.values(RETURN_REASON),
      required: true
    },
    items: {
      type: [
        {
          orderItemId: mongoose.Schema.Types.ObjectId,
          quantity: Number,
          reason: String,
          condition: String,
          images: [String]
        }
      ],
      required: true,
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one item must be included in the return"
      }
    },
    customerNotes: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    adminNotes: {
      type: String,
      maxlength: 2000,
      trim: true
    },
    inspectionStatus: {
      type: String,
      enum: ["pending", "pass", "fail"],
      default: "pending"
    },
    inspectionNotes: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Refund",
      sparse: true
    },
    approvedById: {
      type: String,
      sparse: true
    },
    completedAt: {
      type: Date,
      sparse: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
returnSchema.index({ orderId: 1, status: 1 });
returnSchema.index({ userId: 1, createdAt: -1 });
returnSchema.index({ createdAt: -1 });
returnSchema.index({ completedAt: -1 });

const Return = mongoose.model("Return", returnSchema);

export default Return;
