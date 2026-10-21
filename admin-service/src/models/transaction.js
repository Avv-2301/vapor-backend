const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: String,
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal", "purchase"],
      required: true,
    },
    reason:{
      type:String,
    },
    spentType: {
      type: String,
      enum: ["purchase", "top-up", "refund"],
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "stripe", "card", "wallet", "manual"],
    },
    gameId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending", "cancelled", "refund"],
      required: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ spentType: 1, status: 1, createdAt: -1, paymentMethod: 1 });
transactionSchema.index({ gameId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
