const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  helpfulCount: {
    type: Number,
    default: 0,
  },
  isApproved: {
    type: Boolean,
    default: false, // Admin approval required
  },
}, {
  timestamps: true,
});

// One review per user per product
reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
reviewSchema.index({ productId: 1, isApproved: 1 });
reviewSchema.index({ userId: 1 });

module.exports = mongoose.model("Review", reviewSchema);

