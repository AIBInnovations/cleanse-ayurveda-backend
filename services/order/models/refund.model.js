import mongoose from "mongoose";
import { REFUND_STATUS, REFUND_REASON } from "../utils/constants.js";

const refundSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      
    },
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    gatewayRefundId: {
      type: String,
      sparse: true,
      index: true
    },
    type: {
      type: String,
      enum: ["full", "partial"],
      required: true,
      index: true
    },
    reason: {
      type: String,
      enum: Object.values(REFUND_REASON),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.PENDING,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    items: {
      type: [
        {
          orderItemId: mongoose.Schema.Types.ObjectId,
          quantity: Number,
          amount: Number
        }
      ],
      default: []
    },
    initiatedByType: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
      index: true
    },
    initiatedById: {
      type: String,
      required: true
    },
    approvedById: {
      type: String,
      sparse: true
    },
    notes: {
      type: String,
      maxlength: 1000,
      trim: true
    },
    processedAt: {
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
refundSchema.index({ orderId: 1, status: 1 });
refundSchema.index({ paymentId: 1 });
refundSchema.index({ createdAt: -1 });
refundSchema.index({ processedAt: -1 });

const Refund = mongoose.model("Refund", refundSchema);

export default Refund;
