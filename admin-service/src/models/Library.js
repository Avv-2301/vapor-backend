const mongoose = require("mongoose");

const libraryGameSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  gameName: { type: String, required: true },
  purchaseDate: { type: Date, default: Date.now },
  purchasePrice: { type: Number, default: 0 },
  discountApplied: { type: Number, default: 0 },
  purchaseSource: { type: String, default: "purchase" },
  status: { type: String, default: "active" },
  playTime: { type: Number, default: 0 },
  lastPlayed: { type: Date, default: null },
  isInstalled: { type: Boolean, default: false },
}, { _id: false });

const librarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  games: { type: [libraryGameSchema], default: [] },
  totalGames: { type: Number, default: 0 },
  totalPlayTime: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("Library", librarySchema);
