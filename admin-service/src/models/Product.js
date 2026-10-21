const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  thumbnail:{
    type:String,
    required:true,
  },
  description: {
    type: String,
    required: true,
  },
  shortDescription: {
    type: String,
    maxlength: 200,
  },
  category:{
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discountPrice: {
    type: Number,
    min: 0,
    default: null,
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  isDiscountActive: {
    type: Boolean,
    default: false,
  },
  isDiscountManuallyActive: {
    type: Boolean,
    default: false,
  },
  isDiscountPromotionActive: {
    type: Boolean,
    default: false,
  },
  matureContentDescription: {
    type: String,
    default: "",
  },
  metascore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  achievementCount: {
    type: Number,
    min: 0,
    default: 0,
  },
  featureHighlights: {
    type: [{ title: String, description: String }],
    default: [],
  },
  supportedFeatures: {
    type: [String],
    default: [],
  },
  languageSupport: {
    type: [{
      language: String,
      interface: { type: Boolean, default: false },
      audio: { type: Boolean, default: false },
      subtitles: { type: Boolean, default: false },
    }],
    default: [],
  },
  releaseDate: {
    type: Date,
    required: true,
  },
  developer: {
    type: String,
    required: true,
  },
  publisher: {
    type: String,
    required: true,
  },
  genres: {
    type: [String],
    default: [],
  },
  tags: {
    type: [String],
    default: [],
  },
  images: {
    type: [String],
    default: [],
  },
  videos: {
    type: [String],
    default: [],
  },
  screenshots: {
    type: [String],
    default: [],
  },
  systemRequirements: {
    minimum: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String,
      directX: String,
    },
    recommended: {
      os: String,
      processor: String,
      memory: String,
      graphics: String,
      storage: String,
      directX: String,
    },
  },
  languages: {
    type: [String],
    default: [],
  },
  ageRating: {
    type: String,
    enum: ["E", "E10+", "T", "M", "AO", "RP"],
    default: "RP",
  },
  platform: {
    type: [String],
    enum: ["Windows", "Mac", "Linux"],
    default: [],
  },
  downloadSize: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  stock: {
    type: Number,
    default: -1, // -1 means unlimited
  },
  totalSales: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for search
productSchema.index({ name: "text", description: "text", developer: "text", publisher: "text" });
productSchema.index({ genres: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ releaseDate: -1 });

module.exports = mongoose.model("Product", productSchema);

