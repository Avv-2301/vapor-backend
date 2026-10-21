const options = require("../services/timeFormat");

function logger(req, res, next) {
  const method = req.method;
  const path = req.originalUrl;
  const time = new Date().toLocaleString("en-IN", options);

  const fullUrl = `${time}${" "}${req.protocol}://${req.get("host")}${
    req.originalUrl
  }`;
  console.log(`[Gateway] ${method} ${fullUrl}`);
  next();
}

module.exports = logger;
