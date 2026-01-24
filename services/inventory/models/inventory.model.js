import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true,
    },
    variantId: {
      type: String,
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },
    qtyOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    qtyReserved: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: 0,
    },
    backorderLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.index({ productId: 1, warehouseId: 1 });
inventorySchema.index({ variantId: 1, warehouseId: 1 });

inventorySchema.virtual("qtyAvailable").get(function () {
  return Math.max(0, this.qtyOnHand - this.qtyReserved);
});

inventorySchema.virtual("status").get(function () {
  const available = this.qtyAvailable;
  if (available === 0) return "out_of_stock";
  if (available <= this.lowStockThreshold) return "low_stock";
  return "in_stock";
});

inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
