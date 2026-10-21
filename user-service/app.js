const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", (req, res) =>
  res.json({ success: true, message: "user-service is running" })
);
app.use("/", require("./src/routes"));
app.use((err, req, res, next) => {
  const status = [400, 409, 502, 503].includes(err.status) ? err.status : 500;
  console.error(err.message);
  res
    .status(status)
    .json({
      meta: {
        code: status,
        message:
          status === 400 ? "Invalid request body" : err.status && status !== 500 ? err.message : "Internal server error",
      },
    });
});
module.exports = app;
