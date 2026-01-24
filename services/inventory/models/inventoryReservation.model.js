import mongoose from "mongoose";

const inventoryReservationSchema = new mongoose.Schema(
  {
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },
    cartId: {
      type: String,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["active", "released", "converted", "expired"],
      default: "active",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

inventoryReservationSchema.index({ inventoryId: 1, status: 1 });
inventoryReservationSchema.index({ status: 1, expiresAt: 1 });

const InventoryReservation = mongoose.model(
  "InventoryReservation",
  inventoryReservationSchema
);

export default InventoryReservation;
