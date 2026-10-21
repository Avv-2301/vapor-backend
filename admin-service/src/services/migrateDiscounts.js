const mongoose = require("mongoose");
const Discount = require("../models/discount");

const migrateDiscounts = async () => {
  const collection = Discount.collection;
  let indexes;
  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error.code === 26 || error.codeName === "NamespaceNotFound") return;
    throw error;
  }

  for (const index of indexes) {
    if (Object.keys(index.key).length === 1 && index.key.code === 1) {
      await collection.dropIndex(index.name);
    }
  }

  await mongoose.connection.collection(collection.name).updateMany(
    { code: { $exists: true } },
    { $unset: { code: "" } }
  );
};

module.exports = migrateDiscounts;
