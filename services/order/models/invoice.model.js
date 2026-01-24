import mongoose from "mongoose";
import { INVOICE_STATUS } from "../utils/constants.js";

const invoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ["sale", "credit_note"],
      default: "sale",
      index: true
    },
    status: {
      type: String,
      enum: Object.values(INVOICE_STATUS),
      default: INVOICE_STATUS.DRAFT,
      index: true
    },
    totals: {
      type: {
        subtotal: Number,
        discount: Number,
        shipping: Number,
        tax: Number,
        grandTotal: Number
      },
      required: true
    },
    billingAddressSnapshot: {
      type: {
        fullName: String,
        phone: String,
        addressLine1: String,
        addressLine2: String,
        landmark: String,
        city: String,
        state: String,
        pincode: String,
        country: String
      },
      required: true
    },
    taxSummary: {
      type: {
        cgst: Number,
        sgst: Number,
        igst: Number,
        totalTax: Number
      },
      default: {}
    },
    gstin: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true
    },
    pdfUrl: {
      type: String,
      trim: true
    },
    issuedAt: {
      type: Date,
      sparse: true
    },
    createdById: {
      type: String,
      required: true
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
invoiceSchema.index({ orderId: 1, type: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ issuedAt: -1 });

export const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
