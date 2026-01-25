import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
    },
    thumbnail_url: {
      type: String,
    },
    mime_type: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
    },
    alt_text: {
      type: String,
      trim: true,
    },
    folder: {
      type: String,
      default: "general",
      trim: true,
    },
    uploaded_by_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

export default mongoose.model("Media", mediaSchema);
