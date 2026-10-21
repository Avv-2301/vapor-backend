const mongoose = require("mongoose");

// This model reads banners created by admin-service from the shared database.
const bannerSchema = new mongoose.Schema(
  {
    title: String,
    image: String,
    position: String,
    link: String,
    linkTarget: String,
    deviceTypes: [String],
    priority: Number,
    status: String,
    startDate: Date,
    endDate: Date,
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { collection: "banners", timestamps: true }
);

module.exports = mongoose.models.Banner || mongoose.model("Banner", bannerSchema);
