import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },
    type: {
      type: String,
      enum: ["shipping", "billing", "both"],
      default: "both",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      index: true,
    },
    country: {
      type: String,
      default: "India",
    },
    landmark: {
      type: String,
      trim: true,
      default: null,
    },
    isDefaultShipping: {
      type: Boolean,
      default: false,
    },
    isDefaultBilling: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

addressSchema.index({ userId: 1, isDefaultShipping: 1 });
addressSchema.index({ userId: 1, isDefaultBilling: 1 });

const Address = mongoose.model("Address", addressSchema);

export default Address;
