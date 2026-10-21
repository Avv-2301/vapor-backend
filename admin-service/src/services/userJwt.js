const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports.issueToken = (payload) => {
  return jwt.sign(
    {
      id: payload?.id,
      role: payload?.role,
      expiry: payload?.expiry,
    },
    process.env.JWT_USER_SECRETKEY,
    { algorithm: "HS512", expiresIn: "24h" }
  );
};

