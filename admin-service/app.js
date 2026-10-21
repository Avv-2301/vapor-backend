const express = require("express");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const os = require("os");
const path = require("path");
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(os.tmpdir(), "gamers-vault-uploads"),
  createParentPath: true,
  safeFileNames: true,
  preserveExtension: true,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  abortOnLimit: true,
}));
app.use(cookieParser());
app.get("/", (req, res) => res.json({ success: true, message: "admin-service is running" }));
app.use("/", require("./src/routes"));
app.use((err, req, res, next) => {
  const status = err.status === 400 ? 400 : 500;
  console.error(err.message);
  res.status(status).json({ meta: { code: status, message: status === 400 ? "Invalid request body" : "Internal server error" } });
});
module.exports = app;
