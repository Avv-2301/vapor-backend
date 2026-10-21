const mongoose = require("mongoose");
exports.connect = () => mongoose.connect(process.env.MONGO_URL);
exports.disconnect = () => mongoose.disconnect();
