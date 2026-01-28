import mongoose from "mongoose";

// Sub-schema for feature items (features_grid)
const featureItemSchema = new mongoose.Schema(
  {
    icon_url: {
      type: String,
      trim: true,
      default: null,
    },
    heading: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

// Sub-schema for image items (bento_layout)
const imageItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      required: true,
    },
    alt_text: {
      type: String,
      trim: true,
      default: null,
    },
    link_url: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

// Sub-schema for product references (bento_layout)
const productReferenceSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // Optional override for product image in this section
    custom_image_url: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { _id: false }
);

// Sub-schema for text overlays (bento_layout)
const textOverlaySchema = new mongoose.Schema(
  {
    heading: {
      type: String,
      trim: true,
      default: null,
    },
    body: {
      type: String,
      trim: true,
      default: null,
    },
    position: {
      type: String,
      enum: ["top_left", "top_right", "bottom_left", "bottom_right", "center"],
      default: "center",
    },
  },
  { _id: false }
);

// Main Homepage Section schema
const homepageSectionSchema = new mongoose.Schema(
  {
    // Unique, human-readable name
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // Section type discriminator
    section_type: {
      type: String,
      enum: ["features_grid", "bento_layout", "product_showcase"],
      required: true,
    },

    // Display settings (common across all types)
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
    background_color: {
      type: String,
      trim: true,
      default: "#ffffff",
    },
    text_color: {
      type: String,
      trim: true,
      default: "#000000",
    },

    // Content for features_grid section type
    features: {
      type: [featureItemSchema],
      default: [],
    },

    // Content for bento_layout section type
    bento_items: {
      images: {
        type: [imageItemSchema],
        default: [],
      },
      products: {
        type: [productReferenceSchema],
        default: [],
      },
      text_overlays: {
        type: [textOverlaySchema],
        default: [],
      },
    },

    // Content for product_showcase section type
    showcase_product: {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
      },
      image_url: {
        type: String,
        trim: true,
        default: null,
      },
      heading: {
        type: String,
        trim: true,
        default: null,
      },
      description: {
        type: String,
        trim: true,
        default: null,
      },
      cta_text: {
        type: String,
        trim: true,
        default: "Shop Now",
      },
      layout: {
        type: String,
        enum: ["image_left", "image_right", "image_background"],
        default: "image_left",
      },
    },

    // Visibility and scheduling
    is_active: {
      type: Boolean,
      default: true,
    },
    starts_at: {
      type: Date,
      default: null,
    },
    ends_at: {
      type: Date,
      default: null,
    },

    // Metadata
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
homepageSectionSchema.index({ name: 1 }, { unique: true });
homepageSectionSchema.index({ is_active: 1 });
homepageSectionSchema.index({ section_type: 1 });
homepageSectionSchema.index({ is_active: 1, section_type: 1 });

// Pre-save validation: Ensure appropriate content for each section type
homepageSectionSchema.pre("save", function () {
  switch (this.section_type) {
    case "features_grid":
      if (!this.features || this.features.length === 0) {
        throw new Error("features_grid section requires at least one feature item");
      }
      break;

    case "bento_layout":
      const bentoItemCount =
        (this.bento_items?.images?.length || 0) +
        (this.bento_items?.products?.length || 0);
      if (bentoItemCount === 0) {
        throw new Error(
          "bento_layout section requires at least one image or product"
        );
      }
      break;

    case "product_showcase":
      if (!this.showcase_product?.product_id) {
        throw new Error("product_showcase section requires a product_id");
      }
      break;

    default:
      throw new Error(`Invalid section_type: ${this.section_type}`);
  }
});

export default mongoose.model("HomepageSection", homepageSectionSchema);
