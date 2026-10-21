const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    profilePhoto: {
      type: String,
    },
    name: {
      type: String,
      required: true,
    },
    quote: {
      type: String,
      maxlength: 25,
    },
    rank: {
      type: Number,
      default: 1,
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
    profileType: {
      type: String,
      required: true,
      enum: ["public", "private"],
      default: "public",
    },
    city: {
      type: String,
      default: null,
    },
    library: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
