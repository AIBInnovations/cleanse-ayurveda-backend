import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      required: true,
      trim: true,
    },
    customer_photo_url: {
      type: String,
      trim: true,
      default: null,
    },
    testimonial_text: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    before_photo_url: {
      type: String,
      trim: true,
      default: null,
    },
    after_photo_url: {
      type: String,
      trim: true,
      default: null,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    is_verified_purchase: {
      type: Boolean,
      default: false,
    },
    is_featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
    created_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

testimonialSchema.index({ is_active: 1, sort_order: 1 });
testimonialSchema.index({ is_featured: 1, is_active: 1 });

export default mongoose.model("Testimonial", testimonialSchema);
