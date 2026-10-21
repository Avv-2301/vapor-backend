const mongoose = require("mongoose");

const giftCardCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    redeemedAt: { type: Date, default: null },
  },
  { _id: false }
);

const giftCardSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    codePrefix: { type: String, trim: true, maxlength: 24, default: "GAMER" },
    notes: { type: String, trim: true, maxlength: 500, default: "" },
    image: { type: String, trim: true, maxlength: 2048, default: null },
    expiresAt: { type: Date, default: null },
    codes: {
      type: [giftCardCodeSchema],
      required: true,
      validate: [
        (codes) => codes.length > 0,
        "At least one gift card code is required",
      ],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

giftCardSchema.index({ "codes.code": 1 }, { unique: true });
giftCardSchema.index({ createdAt: -1 });

module.exports = mongoose.model("GiftCard", giftCardSchema);
