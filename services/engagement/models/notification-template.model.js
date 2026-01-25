import mongoose from "mongoose";

const templateContentSchema = new mongoose.Schema(
  {
    subject: { type: String, trim: true, default: null },
    body: { type: String, trim: true, required: true },
    templateName: { type: String, trim: true, default: null }, // For WhatsApp templates
  },
  { _id: false }
);

const notificationTemplateSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["transactional", "marketing", "system"],
      required: true,
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ["email", "sms", "whatsapp", "push"],
      },
    ],
    templates: {
      email: templateContentSchema,
      sms: templateContentSchema,
      whatsapp: templateContentSchema,
      push: templateContentSchema,
    },
    variables: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationTemplateSchema.index({ code: 1 });
notificationTemplateSchema.index({ category: 1, isActive: 1 });

const NotificationTemplate = mongoose.model("NotificationTemplate", notificationTemplateSchema);

export default NotificationTemplate;
