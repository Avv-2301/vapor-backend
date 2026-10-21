const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const User = require("../../models/auth");
const {
  loginValidation,
  updatePasswordValidation,
} = require("../../services/Validation");
const UserLoginHistory = require("../../models/loginHistory");
const { issueToken } = require("../../services/userJwt");
const axios = require("axios");
const ip = require("ip");
const bcrypt = require("bcrypt");
const zxcvbn = require("zxcvbn");
const mongoose = require("mongoose");
const { getClientInfo } = require("../../services/clientInfo");

module.exports = {
  /**
   * @description This function is used to login admin
   * @param req
   * @param res
   */
  login: async (req, res) => {
    try {
      // console.log("login admin");
      const requestParams = req.body;

      if (!requestParams?.email || !requestParams?.password) {
        return Response.errorResponseData(
          res,
          "All Fields Required",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      loginValidation(requestParams, res, async (validate) => {
        if (validate) {
          const user = await User.findOne({
            email: requestParams?.email,
          }).populate("profile", "profilePhoto");
          // console.log(user, "USER DATAAA");

          let system_ip = ip.address(); //system ip address

          //get browser ip address with timeout
          let browser_ip;
          try {
            browser_ip = await axios.get(
              "https://api.ipify.org/?format=json",
              { timeout: 5000 } // 5 second timeout
            );
          } catch (error) {
            // If IP lookup fails, continue without it
            console.log("IP lookup failed, continuing without browser IP");
            browser_ip = { data: { ip: "unknown" } };
          }

          if (user && user?.role === Constant.ROLE.ADMIN) {
            if (user && user?.verified !== null) {
              if (user && user?.status === Constant.FLAGS.ACTIVE) {
                const comparePassword = await bcrypt.compare(
                  requestParams?.password,
                  user.password
                );
                if (comparePassword) {
                  const expiresIn = 60 * 60;
                  // console.log(expiresIn);
                  const userExpTime = Math.floor(Date.now() / 1000) + expiresIn;
                  // console.log(userExpTime);

                  const payload = {
                    id: user?._id,
                    role: user?.role,
                    expiry: userExpTime,
                  };

                  const token = issueToken(payload);
                  // console.log(token, "TOKEN");

                  res.cookie("adminToken", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "lax",
                    maxAge: expiresIn * 1000,
                    path: "/",
                  });
                  const meta = {};
                  const clientInfo = getClientInfo(req.get("user-agent"));
                  let tokenUpdate = {};

                  tokenUpdate = {
                    $set: {
                      last_login: new Date(),
                      token: token,
                      tokenExpiresAt: new Date(userExpTime * 1000),
                      "ip_address.system_ip": system_ip,
                      "ip_address.browser_ip": browser_ip?.data?.ip,
                    },
                  };

                  let loginHistory = await UserLoginHistory.findOne({
                    userId: user?._id,
                  });
                  let loginHistoryObject = {};

                  if (loginHistory) {
                    loginHistoryObject = {
                      loginDetails: {
                        ip_address: {
                          system_ip: system_ip,
                          browser_ip: browser_ip?.data?.ip,
                        },
                        ...clientInfo,
                        status: "success",
                        last_login: new Date(),
                      },
                    };

                    let update = {};
                    if (loginHistory?.loginDetails?.length !== 100) {
                      tenRecords = loginHistoryObject;
                      update = {
                        $push: {
                          loginDetails: loginHistoryObject?.loginDetails,
                        },
                      };
                    } else {
                      update = {
                        $set: {
                          loginDetails: [],
                        },
                      };
                    }

                    await UserLoginHistory.updateOne(
                      { userId: user._id },
                      update
                    );
                  } else {
                    loginHistoryObject = {
                      userId: user._id,
                      loginDetails: {
                        ip_address: {
                          system_ip: system_ip,
                          browser_ip: browser_ip?.data?.ip,
                        },
                        ...clientInfo,
                        status: "success",
                        last_login: new Date(),
                      },
                    };

                    const history = await UserLoginHistory.create(
                      loginHistoryObject
                    );
                    tokenUpdate.$set.loginHistory = history?._id;
                  }
                  await User.updateOne({ _id: user?._id }, tokenUpdate);

                  const safeUser = user.toObject();
                  delete safeUser.token;
                  delete safeUser.password;

                  return Response.successResponseData(
                    res,
                    safeUser,
                    Constant.STATUS_CODES.SUCCESS,
                    "Login Successfull",
                    meta
                  );
                } else {
                  return Response.validationErrorResponseData(
                    res,
                    "Password Not Correct",
                    Constant.STATUS_CODES.UNAUTHORIZED
                  );
                }
              } else {
                return Response.errorResponseWithoutData(
                  res,
                  "User is InActive",
                  Constant.STATUS_CODES.BAD_REQUEST
                );
              }
            } else {
              return Response.errorResponseWithoutData(
                res,
                "User is not Verified",
                Constant?.STATUS_CODES.BAD_REQUEST
              );
            }
          } else {
            return Response.errorResponseWithoutData(
              res,
              "Access denied",
              Constant.STATUS_CODES.BAD_REQUEST
            );
          }
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to logout
   * @param req
   * @param res
   */
  logout: async (req, res) => {
    try {
      const userId = req.authUserId;
      const userRole = req.role;

      if (!userId || userRole !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Authenticated admin required",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      const user = await User.findOne({
        _id: userId,
        role: Constant.ROLE.ADMIN,
      });
      if (!user) {
        return Response.errorResponseWithoutData(
          res,
          "Admin not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      }

      await User.updateOne(
        { _id: userId, role: Constant.ROLE.ADMIN },
        {
          $set: {
            token: null,
            tokenExpiresAt: null,
            "ip_address.system_ip": null,
            "ip_address.browser_ip": null,
          },
        }
      );

      res.clearCookie("adminToken", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      return Response.successResponseWithoutData(
        res,
        "Admin logged out successfully",
        Constant.STATUS_CODES.SUCCESS
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Validates the current admin session and returns the admin's basic account details.
   * @param req
   * @param res
   */
  getSession: async (req, res) => {
    try {
      const user = await User.findOne({
        _id: req.authUserId,
        role: Constant.ROLE.ADMIN,
        status: Constant.FLAGS.ACTIVE,
      }).select("name email role status");

      if (!user) {
        return Response.errorResponseWithoutData(
          res,
          "Admin session is no longer valid",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      return Response.successResponseData(
        res,
        user,
        Constant.STATUS_CODES.SUCCESS,
        "Admin session is valid"
      );
    } catch (error) {
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get logged-in user's login history
   * @param req
   * @param res
   */
  getLoginHistory: async (req, res) => {
    try {
      const userId = req.params.userId;
      if ((req.role || req.headers["x-user-role"]) !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(res, "Admin access required", Constant.STATUS_CODES.FORBIDDEN);
      }
      if (!mongoose.isValidObjectId(userId)) {
        return Response.errorResponseWithoutData(
          res,
          "Invalid user ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      // Find login history for the user
      // This endpoint is also used by the admin's own Login History modal.
      // Admins have login history records in the same collection as users.
      const targetUser = await User.findById(userId).select("_id");
      if (!targetUser) return Response.errorResponseWithoutData(res, "User not found", Constant.STATUS_CODES.PAGE_NOT_FOUND);
      const loginHistory = await UserLoginHistory.findOne({ userId });

      if (!loginHistory) {
        return Response.successResponseData(
          res,
          { loginDetails: [] },
          Constant.STATUS_CODES.SUCCESS,
          "No login history found"
        );
      }

      // Sort login details by last_login in descending order (most recent first)
      const sortedLoginDetails = loginHistory.loginDetails
        ? [...loginHistory.loginDetails].sort(
            (a, b) => new Date(b.last_login) - new Date(a.last_login)
          )
        : [];

      return Response.successResponseData(
        res,
        {
          userId: targetUser._id,
          loginDetails: sortedLoginDetails,
          totalLogins: sortedLoginDetails.length,
        },
        Constant.STATUS_CODES.SUCCESS,
        "Login history retrieved successfully"
      );
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to update admin password
   * @param req
   * @param res
   */
  updatePassword: async (req, res) => {
    try {
      const requestParams = req.body;
      // console.log(requestParams, "REQUEST PARAMS");
      const userId = req.params.userId;

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User ID not found. Authentication required.",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      }

      if (!requestParams?.newPassword || !requestParams?.confirmPassword) {
        return Response.errorResponseWithoutData(
          res,
          "New password and confirm password are required",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      // Check if new password and confirm password match
      if (requestParams.newPassword !== requestParams.confirmPassword) {
        return Response.errorResponseWithoutData(
          res,
          "New password and confirm password do not match",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }

      updatePasswordValidation(requestParams, res, async (validate) => {
        if (validate) {
          // Find the admin user
          const user = await User.findOne({ _id: userId });

          if (!user) {
            return Response.errorResponseWithoutData(
              res,
              "User not found",
              Constant.STATUS_CODES.NO_CONTENT
            );
          }

          // Verify user is admin
          if (user.role !== Constant.ROLE.ADMIN) {
            return Response.errorResponseWithoutData(
              res,
              "Access denied. Admin privileges required.",
              Constant.STATUS_CODES.FORBIDDEN
            );
          }

          // Check if new password is same as current password
          const isSamePassword = await bcrypt.compare(
            requestParams.newPassword,
            user.password
          );

          if (isSamePassword) {
            return Response.errorResponseWithoutData(
              res,
              "New password must be different from current password",
              Constant.STATUS_CODES.BAD_REQUEST
            );
          }

          // Check password strength
          const passwordStrength = zxcvbn(requestParams.newPassword);
          if (passwordStrength.score < 2) {
            return Response.errorResponseWithoutData(
              res,
              "Password is too weak. Please choose a stronger password.",
              Constant.STATUS_CODES.NOT_ACCEPTABLE
            );
          }

          // Hash the new password
          const hashedPassword = await bcrypt.hash(
            requestParams.newPassword,
            10
          );

          // Update password
          await User.updateOne(
            { _id: userId },
            {
              $set: {
                password: hashedPassword,
              },
            }
          );

          return Response.successResponseWithoutData(
            res,
            "Password updated successfully",
            Constant.STATUS_CODES.SUCCESS
          );
        }
      });
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
