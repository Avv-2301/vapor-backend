const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  scope: { type: String, required: true, enum: ["game", "category"] },
  selectedGames: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  selectedCategories: [{ type: String, trim: true }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isPaused: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

discountSchema.index({ createdAt: -1 });
discountSchema.index({ scope: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Discount", discountSchema);
