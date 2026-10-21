const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    orderId: String,
    stripeSessionId: { type: String, default: null },
    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal", "purchase"],
      required: true,
    },
    reason: String,
    spentType: { type: String, enum: ["purchase", "top-up", "refund"] },
    paymentMethod: { type: String, enum: ["razorpay", "stripe", "card", "wallet", "manual"] },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["success", "failed", "pending", "cancelled", "refund"],
      required: true,
    },
  },
  { timestamps: true, collection: "transactions" },
);

module.exports = mongoose.model("Transaction", transactionSchema);
