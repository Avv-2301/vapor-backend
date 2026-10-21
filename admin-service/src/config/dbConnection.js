const mongoose = require("mongoose");
const migrateDiscounts = require("../services/migrateDiscounts");
const { refreshDiscountActivation, stopDiscountActivation } = require("../services/discountActivation");

const connect = () => {
  const url = process.env.MONGO_URL;

  return mongoose.connect(url).then(async (data) => {
    await migrateDiscounts();
    await refreshDiscountActivation();
    console.log(`Mongodb connected with server: ${data.connection.host}`);
  });
};

const disconnect = () => {
  stopDiscountActivation();
  if (!mongoose.connection) {
    return;
  }

  mongoose.disconnect();

  mongoose.once("close", async () => {
    console.log("Disconnected to database");
  });
};

module.exports = {
  connect,
  disconnect,
};

