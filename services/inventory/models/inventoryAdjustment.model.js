import mongoose from "mongoose";

const inventoryAdjustmentSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["restock", "sale", "return", "damage", "correction"],
      required: true,
      index: true,
    },
    qtyChange: {
      type: Number,
      required: true,
    },
    qtyBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    qtyAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    referenceType: {
      type: String,
      enum: ["order", "return", "manual", "system"],
      default: "manual",
      index: true,
    },
    referenceId: {
      type: String,
      index: true,
    },
    adjustedById: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

inventoryAdjustmentSchema.index({ inventoryId: 1, createdAt: -1 });
inventoryAdjustmentSchema.index({ referenceType: 1, referenceId: 1 });

const InventoryAdjustment = mongoose.model(
  "InventoryAdjustment",
  inventoryAdjustmentSchema
);

export default InventoryAdjustment;
