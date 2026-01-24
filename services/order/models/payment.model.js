import mongoose from "mongoose";
import { PAYMENT_STATUS, PAYMENT_METHOD } from "../utils/constants.js";

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    gateway: {
      type: String,
      default: "razorpay",
      lowercase: true,
      trim: true
    },
    gatewayOrderId: {
      type: String,
      sparse: true,
      index: true
    },
    gatewayPaymentId: {
      type: String,
      sparse: true,
      index: true
    },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
      index: true
    },
    methodDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    capturedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundedAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    fee: {
      type: Number,
      default: 0,
      min: 0
    },
    errorMessage: {
      type: String,
      trim: true
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    capturedAt: {
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
paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ capturedAt: -1 });

export const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
