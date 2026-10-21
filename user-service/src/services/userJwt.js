const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports.issueToken = (payload, expiresIn = 60 * 60) => {
  return jwt.sign(
    {
      id: payload?.id,
      role: payload?.role,
      expiry: payload?.expiry,
    },
    process.env.JWT_USER_SECRETKEY,
    { algorithm: "HS512", expiresIn }
  );
};
