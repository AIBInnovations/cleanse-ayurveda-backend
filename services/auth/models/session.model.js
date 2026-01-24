import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "userModel",
      required: false,
      index: true,
      sparse: true,
    },
    userModel: {
      type: String,
      enum: ["User", "Admin", "Guest"],
      required: false,
    },
    userType: {
      type: String,
      enum: ["consumer", "admin", "guest"],
      required: true,
    },
    guestId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenExpiresAt: {
      type: Date,
      required: true,
    },
    deviceInfo: {
      deviceId: String,
      deviceType: String,
      os: String,
      browser: String,
      ip: String,
      userAgent: String,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ guestId: 1, isActive: 1 });
sessionSchema.index({ userType: 1, expiresAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model("Session", sessionSchema);

export default Session;
