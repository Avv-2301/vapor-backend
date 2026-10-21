const mongoose = require("mongoose");

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    loginDetails: [{ type: Object }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserLoginHistory", loginHistorySchema);
