const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    image: { type: String, required: true, trim: true },
    position: {
      type: String,
      required: true,
      enum: [
        "homepage-hero",
        "homepage-featured",
        "homepage-sidebar",
        "category-header",
        "game-page",
      ],
    },
    link: { type: String, default: null, trim: true },
    linkTarget: { type: String, enum: ["_self", "_blank"], default: "_self" },
    deviceTypes: {
      type: [String],
      enum: ["desktop", "mobile"],
      default: ["desktop", "mobile"],
    },
    priority: { type: Number, min: 1, max: 10, default: 1 },
    status: {
      type: String,
      enum: ["active", "scheduled", "expired", "disabled"],
      default: "active",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    clicks: { type: Number, default: 0, min: 0 },
    impressions: { type: Number, default: 0, min: 0 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

bannerSchema.index({ status: 1, position: 1, priority: 1 });
bannerSchema.index({ title: "text" });

module.exports = mongoose.model("Banner", bannerSchema);
