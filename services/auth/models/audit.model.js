import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "actorModel",
      default: null,
    },
    actorModel: {
      type: String,
      enum: ["User", "Admin", null],
      default: null,
    },
    actorType: {
      type: String,
      enum: ["consumer", "admin", "system"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditSchema.index({ actorId: 1 });
auditSchema.index({ createdAt: -1 });
auditSchema.index({ entityType: 1, entityId: 1 });

const Audit = mongoose.model("Audit", auditSchema);

export default Audit;
