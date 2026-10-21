const jwt = require("jsonwebtoken");
const User = require("../models/auth");
const { isValidObjectId } = require("mongoose");
const userAuth = async (req, res, next) => {
  const token =
    req.cookies?.vapor_user_token ||
    req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token)
    return res
      .status(401)
      .json({ meta: { code: 401, message: "Please sign in" } });
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_USER_SECRETKEY, {
      algorithms: ["HS512"],
    });
  } catch {
    return res
      .status(401)
      .json({ meta: { code: 401, message: "Session expired or invalid" } });
  }
  if (payload.role !== "user" || !isValidObjectId(payload.id)) {
    return res
      .status(403)
      .json({ meta: { code: 403, message: "Access denied" } });
  }
  try {
    const user = await User.findOne({
      _id: payload.id,
      role: payload.role,
      status: "1",
      token,
    }).select("_id role");
    if (!user)
      return res
        .status(401)
        .json({ meta: { code: 401, message: "Session is no longer valid" } });
    req.authUserId = String(user._id);
    req.role = user.role;
    req.headers["x-user-id"] = req.authUserId;
    req.headers["x-user-role"] = req.role;
    return next();
  } catch (error) {
    return next(error);
  }
};
module.exports = { userAuth };
