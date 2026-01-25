import mongoose from "mongoose";

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    popup_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Popup",
      default: null,
    },
    source: {
      type: String,
      enum: ["popup", "footer", "page"],
      default: "popup",
    },
    is_subscribed: {
      type: Boolean,
      default: true,
    },
    unsubscribed_at: {
      type: Date,
      default: null,
    },
    metadata: {
      user_agent: { type: String, default: null },
      ip_address: { type: String, default: null },
      page_url: { type: String, default: null },
    },
  },
  {
    timestamps: { createdAt: "subscribed_at", updatedAt: "updated_at" },
  }
);

newsletterSubscriberSchema.index({ email: 1 });
newsletterSubscriberSchema.index({ popup_id: 1 });
newsletterSubscriberSchema.index({ subscribed_at: -1 });
newsletterSubscriberSchema.index({ is_subscribed: 1 });

export default mongoose.model("NewsletterSubscriber", newsletterSubscriberSchema);
