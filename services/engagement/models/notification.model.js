import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NotificationTemplate",
      default: null,
    },
    templateCode: {
      type: String,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    channel: {
      type: String,
      enum: ["email", "sms", "whatsapp", "push"],
      required: true,
    },
    recipient: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      subject: { type: String, trim: true, default: null },
      body: { type: String, trim: true, required: true },
    },
    referenceType: {
      type: String,
      default: null,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ channel: 1, status: 1 });
notificationSchema.index({ referenceType: 1, referenceId: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
