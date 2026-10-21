const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: "../../.env" });
const User = require("../models/auth");
const UserLoginHistory = require("../models/loginHistory");

const createAdmin = async () => {
  try {
    const url = process.env.MONGO_URL;
    if (!url) {
      throw new Error("MONGO_URI is not defined");
    }

    await mongoose.connect(url);

    const existingAdmin = await User.findOne({
      email: process.env.ADMIN_EMAIL,
    });
    if (existingAdmin) {
      console.log("Admin already exists.");
      return;
    }

    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    const user = await User.create({
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      role: "admin",
      password: hash,
      status: "1",
      verified: true,
    });

    let loginHistory = await UserLoginHistory.create({ userId: user?._id });
    await User.updateOne(
      { _id: user?._id },
      {
        $set: {
          loginHistory: loginHistory?._id,
        },
      }
    );
  } catch (error) {
    console.log("Error creating admin:", error.message);
  } finally {
    mongoose.disconnect();
  }
};

createAdmin();

