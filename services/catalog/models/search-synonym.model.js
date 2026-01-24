import mongoose from "mongoose";

const searchSynonymSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    synonyms: {
      type: [String],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

searchSynonymSchema.index({ isActive: 1 });

const SearchSynonym = mongoose.model("SearchSynonym", searchSynonymSchema);

export default SearchSynonym;
