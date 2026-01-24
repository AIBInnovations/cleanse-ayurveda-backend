import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    scientificName: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: null,
    },
    benefits: {
      type: [String],
      default: [],
    },
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ingredientSchema.index({ name: "text" });
ingredientSchema.index({ isActive: 1, deletedAt: 1 });

const Ingredient = mongoose.model("Ingredient", ingredientSchema);

export default Ingredient;
