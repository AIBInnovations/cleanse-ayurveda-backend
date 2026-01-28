import mongoose from "mongoose";

// Sub-schema for section references
const sectionReferenceSchema = new mongoose.Schema(
  {
    // Type of section source
    section_source: {
      type: String,
      enum: [
        "banner", // References Banner model (hero/CTA)
        "custom_section", // References HomepageSection model
        "featured_products", // Dynamic catalog query
        "collections", // References catalog collections
        "testimonials", // References Testimonial model
        "reels", // References Reel model
      ],
      required: true,
    },

    // Reference ID for models that need it
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "sections.reference_model",
      default: null,
    },

    // Dynamic reference model (for mongoose populate)
    reference_model: {
      type: String,
      enum: ["Banner", "HomepageSection", "Testimonial", "Reel", null],
      default: null,
    },

    // Configuration for dynamic sections
    config: {
      // For featured_products section
      product_source: {
        type: String,
        enum: ["featured", "bestseller", "new_arrival", "collection", null],
        default: null,
      },
      collection_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Collection",
        default: null,
      },
      limit: {
        type: Number,
        default: 8,
      },

      // For collections section: which collections to show
      collection_ids: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Collection" }],
        default: [],
      },

      // For testimonials/reels: override default count
      display_count: {
        type: Number,
        default: null,
      },

      // Display preferences
      layout_style: {
        type: String,
        enum: ["grid", "carousel", "list", null],
        default: null,
      },
      heading: {
        type: String,
        trim: true,
        default: null,
      },
      subheading: {
        type: String,
        trim: true,
        default: null,
      },
    },

    // Ordering within layout
    sort_order: {
      type: Number,
      required: true,
      default: 0,
    },

    // Visibility toggle
    is_visible: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// Main Homepage Layout schema
const homepageLayoutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Default Homepage Layout",
    },

    // Array of section references in order
    sections: {
      type: [sectionReferenceSchema],
      default: [],
    },

    // Layout is active/published
    is_active: {
      type: Boolean,
      default: true,
    },

    // Version control - useful for A/B testing or rollbacks
    version: {
      type: Number,
      default: 1,
    },

    // Scheduling
    starts_at: {
      type: Date,
      default: null,
    },
    ends_at: {
      type: Date,
      default: null,
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

// Indexes for fast queries
homepageLayoutSchema.index({ is_active: 1 });
homepageLayoutSchema.index({ version: -1 });

// Pre-save hook: Ensure only one active layout at a time
homepageLayoutSchema.pre("save", async function () {
  if (this.is_active && this.isModified("is_active")) {
    // Deactivate all other layouts
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, is_active: true },
      { $set: { is_active: false } }
    );
  }
});

export default mongoose.model("HomepageLayout", homepageLayoutSchema);
