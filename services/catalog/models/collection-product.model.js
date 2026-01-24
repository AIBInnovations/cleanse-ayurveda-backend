import mongoose from "mongoose";

const collectionProductSchema = new mongoose.Schema(
  {
    collection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true, // We intentionally use 'collection' as a field name
  }
);

collectionProductSchema.index(
  { collection: 1, product: 1 },
  { unique: true }
);
collectionProductSchema.index({ collection: 1, sortOrder: 1 });

const CollectionProduct = mongoose.model(
  "CollectionProduct",
  collectionProductSchema
);

export default CollectionProduct;
