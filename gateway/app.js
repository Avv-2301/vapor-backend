const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors({ origin: (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://localhost:5174").split(",").map(value => value.trim()), credentials: true }));
app.use(require("./src/middleware/logger"));
app.get("/", (req, res) => res.json({ success: true, message: "Gateway is running" }));
app.use(require("./src/routes"));
module.exports = app;
