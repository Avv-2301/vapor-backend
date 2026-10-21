const mongoose = require("mongoose");

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      maxLength: 100,
    },
    email: {
      type: String,
      required: true,
      maxLength: 100,
      unique: true,
    },
    password: {
      type: String,
      maxLength: 100,
    },
    profile: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    authType: {
      type: String,
      maxLength: 100,
    },
    token: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
      type: String,
      default: "0",
      enum: ["0", "1", "2"], //0-inactive, 1- active, 2- deleted
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    billingAddress: {
      type: new mongoose.Schema({
        firstName: String, lastName: String, email: String, callingCode: String,
        phone: String, street: String, unit: String, city: String, region: String,
        postalCode: String, country: String,
      }, { _id: false }),
      default: null,
    },
    loginHistory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserLoginHistory",
    },
    tokenExpiresAt: {
      type: Date,
      required: false,
    },
    last_login: {
      type: Date,
    },
    lastLoginIp: {
      type: String,
      maxLength: 191,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", authSchema);
