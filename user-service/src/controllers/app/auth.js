const bcrypt = require("bcrypt");
const zxcvbn = require("zxcvbn");
const User = require("../../models/auth");
const Profile = require("../../models/Profile");
const Library = require("../../models/Library");
const UserLoginHistory = require("../../models/loginHistory");
const { ensureProfile } = require("../../services/accountProfile");
const { issueToken } = require("../../services/userJwt");
const { getClientInfo } = require("../../services/clientInfo");
const {
  validateRegistration,
  validateLogin,
  validatePasswordStrength,
} = require("../../services/authValidation");

const fail = (res, code, message) =>
  res.status(code).json({ meta: { code, message } });
const AUTH_COOKIE = "vapor_user_token";
const authCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  ...(maxAge !== undefined && { maxAge }),
});
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  profile: user.profile,
});

exports.userSignUp = async (req, res, next) => {
  const { error, value } = validateRegistration(req.body);
  if (error) return fail(res, 400, error.details[0].message);
  if (zxcvbn(value.password).score < 2)
    return fail(res, 406, "Password is too weak");
  let createdUser;
  try {
    if (await User.findOne({ email: value.email }))
      return fail(res, 409, "User already exists");
    createdUser = await User.create({
      name: value.name,
      email: value.email,
      password: await bcrypt.hash(value.password, 10),
      verified: true,
      authType: "direct",
      role: "user",
      status: "1",
    });
    const profile = await ensureProfile(createdUser);
    return res.status(201).json({
      data: { user: publicUser(createdUser), profile },
      meta: { code: 201, message: "User registered successfully" },
    });
  } catch (error) {
    if (createdUser) {
      await Promise.allSettled([
        Profile.deleteMany({ userId: createdUser._id }),
        Library.deleteMany({ userId: createdUser._id }),
        User.deleteOne({ _id: createdUser._id }),
      ]);
    }
    if (error.code === 11000) return fail(res, 409, "User already exists");
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { error, value } = validateLogin(req.body);
  if (error) return fail(res, 400, error.details[0].message);
  try {
    const clientInfo = getClientInfo(req.get("user-agent"));
    const user = await User.findOne({ email: value.email, role: "user" });
    if (!user || !(await bcrypt.compare(value.password, user.password))) {
      if (user) {
        const attemptAt = new Date();
        const ipAddress = req.ip || req.socket.remoteAddress;
        const history = await UserLoginHistory.findOneAndUpdate(
          { userId: user._id },
          {
            $setOnInsert: { userId: user._id },
            $push: {
              loginDetails: {
                $each: [{
                  ip_address: { system_ip: ipAddress, browser_ip: ipAddress },
                  ...clientInfo,
                  last_login: attemptAt,
                  status: "failed",
                  failureReason: "Invalid password",
                }],
                $slice: -100,
              },
            },
          },
          { upsert: true, new: true }
        );
        await User.updateOne({ _id: user._id }, { $set: { loginHistory: history._id } });
      }
      return fail(res, 401, "Email or password is incorrect");
    }
    if (!user.verified || user.status !== "1") {
      const attemptAt = new Date();
      const ipAddress = req.ip || req.socket.remoteAddress;
      const history = await UserLoginHistory.findOneAndUpdate(
        { userId: user._id },
        {
          $setOnInsert: { userId: user._id },
          $push: {
            loginDetails: {
              $each: [{
                ip_address: { system_ip: ipAddress, browser_ip: ipAddress },
                ...clientInfo,
                last_login: attemptAt,
                status: "failed",
                failureReason: "Account is inactive or unverified",
              }],
              $slice: -100,
            },
          },
        },
        { upsert: true, new: true }
      );
      await User.updateOne({ _id: user._id }, { $set: { loginHistory: history._id } });
      return fail(res, 403, "User account is inactive or unverified");
    }
    const expiresIn = value.rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 12;
    const expiry = Math.floor(Date.now() / 1000) + expiresIn;
    const token = issueToken(
      { id: user._id, role: user.role, expiry },
      expiresIn
    );
    const lastLogin = new Date();
    const ipAddress = req.ip || req.socket.remoteAddress;
    const history = await UserLoginHistory.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: { userId: user._id },
        $push: {
          loginDetails: {
            $each: [
              {
                ip_address: { system_ip: ipAddress, browser_ip: ipAddress },
                ...clientInfo,
                last_login: lastLogin,
                status: "success",
              },
            ],
            $slice: -100,
          },
        },
      },
      { upsert: true, new: true }
    );
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          token,
          tokenExpiresAt: new Date(expiry * 1000),
          last_login: lastLogin,
          loginHistory: history._id,
        },
      }
    );
    res.cookie(AUTH_COOKIE, token, authCookieOptions(expiresIn * 1000));
    req.authUserId = String(user._id);
    req.role = user.role;
    return res.json({
      data: publicUser(user),
      meta: {
        code: 200,
        message: "Login successful",
        expiresAt: expiry * 1000,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.authUserId },
      { $unset: { token: 1, tokenExpiresAt: 1 } }
    );
    res.clearCookie(AUTH_COOKIE, authCookieOptions());
    return res.json({
      meta: { code: 200, message: "User logged out successfully" },
    });
  } catch (error) {
    next(error);
  }
};

exports.checkPasswordStrength = (req, res) => {
  const { error, value } = validatePasswordStrength(req.body);
  if (error) return fail(res, 400, error.details[0].message);
  const { score, feedback } = zxcvbn(value.password);
  return res.json({
    data: { score, feedback },
    meta: { code: 200, message: "Password strength" },
  });
};
