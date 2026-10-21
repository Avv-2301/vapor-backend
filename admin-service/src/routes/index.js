const express = require("express");
const adminRoutes = require('./app/admin');

const router = express.Router();

router.use("/", adminRoutes);

module.exports = router;

