const Users = require("../../models/auth");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const Profile = require("../../models/Profile");
const Transaction = require("../../models/transaction");
const Library = require("../../models/Library");
const Product = require("../../models/Product");
const bcrypt = require("bcrypt");
const zxcvbn = require("zxcvbn");
const mongoose = require("mongoose");
const { escapeRegex, verifyAdminPassword } = require("../../services/helper");

module.exports = {
  forceLogoutUser: async (req, res) => {
    try {
      if ((req.role || req.headers["x-user-role"]) !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(res, "Admin access required", Constant.STATUS_CODES.FORBIDDEN);
      }
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      const user = await Users.findOneAndUpdate(
        { _id: id, role: Constant.ROLE.USER },
        { $unset: { token: 1, tokenExpiresAt: 1 } },
        { new: true }
      ).select("_id");
      if (!user) return Response.errorResponseWithoutData(res, "User not found", Constant.STATUS_CODES.PAGE_NOT_FOUND);
      return Response.successResponseData(res, { userId: user._id }, Constant.STATUS_CODES.SUCCESS, "User sessions invalidated");
    } catch (error) {
      console.error("Failed to invalidate user sessions:", error);
      return Response.errorResponseData(res, error.message, Constant.STATUS_CODES.INTERNAL_SERVER);
    }
  },
  resetUserPassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword, adminPassword } = req.body || {};
      if (!id || !mongoose.isValidObjectId(id)) {
        return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      }
      if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
        return Response.errorResponseWithoutData(res, "Password must be between 8 and 72 characters", Constant.STATUS_CODES.BAD_REQUEST);
      }
      if (typeof adminPassword !== "string" || !adminPassword) {
        return Response.errorResponseWithoutData(res, "Admin password is required", Constant.STATUS_CODES.BAD_REQUEST);
      }
      if (!(await verifyAdminPassword(req.authUserId, adminPassword))) {
        return Response.errorResponseWithoutData(res, "Invalid admin password", Constant.STATUS_CODES.UNAUTHORIZED);
      }
      if (zxcvbn(newPassword).score < 2) {
        return Response.errorResponseWithoutData(res, "Password is too weak. Please choose a stronger password.", Constant.STATUS_CODES.BAD_REQUEST);
      }
      const user = await Users.findOne({ _id: id, role: Constant.ROLE.USER });
      if (!user) {
        return Response.errorResponseWithoutData(res, "User not found", Constant.STATUS_CODES.PAGE_NOT_FOUND);
      }
      user.password = await bcrypt.hash(newPassword, 10);
      user.token = undefined;
      user.tokenExpiresAt = undefined;
      await user.save();
      return Response.successResponseData(res, { userId: user._id }, Constant.STATUS_CODES.SUCCESS, "User password changed successfully");
    } catch (error) {
      console.error("Failed to reset user password:", error);
      return Response.errorResponseData(res, error.message, Constant.STATUS_CODES.INTERNAL_SERVER);
    }
  },
  /**
   * @description This function is used to get all users
   * @param req
   * @param res
   */
  getAllUsers: async (req, res) => {
    try {
      const role = req.role || req.headers["x-user-role"];

      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      let {
        page = 1,
        limit = 20,
        search,
        role: selectedRole,
        roles,
        verified,
        sortBy = "createdAt",
        sortOrder = "desc",
        status,
        startDate,
        endDate,
      } = req.query;

      const dateQuery = {};
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (
          (start && Number.isNaN(start.getTime())) ||
          (end && Number.isNaN(end.getTime())) ||
          (start && end && start > end)
        ) {
          return Response.errorResponseWithoutData(
            res,
            "Invalid date range",
            Constant.STATUS_CODES.BAD_REQUEST
          );
        }
        dateQuery.createdAt = {};
        if (start) dateQuery.createdAt.$gte = start;
        if (end) dateQuery.createdAt.$lte = end;
      }

      let query = { ...dateQuery };

      if (status) {
        const statusMap = {
          inactive: "0",
          active: "1",
          banned: "3",
          all: ["0", "1", "3"],
        };

        const mappedStatus = statusMap[status];
        query.status = Array.isArray(mappedStatus)
          ? { $in: mappedStatus }
          : mappedStatus;
      }

      //search functionality
      if (search) {
        const escapedSearch = escapeRegex(search);
        query.$or = [
          { name: { $regex: escapedSearch, $options: "i" } },
          { email: { $regex: escapedSearch, $options: "i" } },
        ];
      }

      //roles filter
      if (selectedRole && selectedRole !== "all") {
        query.role = selectedRole;
      } else if (roles) {
        query.role = { $in: Array.isArray(roles) ? roles : [roles] };
      }

      if (verified === "verified" || verified === "true") {
        query.verified = true;
      } else if (verified === "unverified" || verified === "false") {
        query.verified = false;
      }

      const sortOptions = {};
      if (sortBy === "user") {
        sortOptions.name = sortOrder === "asc" ? 1 : -1;
      } else if (sortBy === "email") {
        sortOptions.email = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      }

      //pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await Users.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__V");

      const totalUsers = await Users.countDocuments(query);
      const activeUsers = await Users.countDocuments({
        ...dateQuery,
        status: "1",
      });
      const inActiveUsers = await Users.countDocuments({
        ...dateQuery,
        status: "0",
      });
      const bannedUsers = await Users.countDocuments({
        ...dateQuery,
        status: "3",
      });

      return Response.successResponseData(
        res,
        {
          users,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalUsers / parseInt(limit)),
            totalUsers,
            activeUsers,
            inActiveUsers,
            bannedUsers,
            limit: parseInt(limit),
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Users found Successfully"
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
   * @description This function is used to get user by id
   * @param req
   * @param res
   */
  getUserById: async (req, res) => {
    try {
      const role = req.role || req.headers["x-user-role"];

      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const userId = req.params.id;
      if (!mongoose.isValidObjectId(userId)) return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      const user = await Users.findById(userId).populate("profile").lean();
      if (!user) return Response.errorResponseWithoutData(res, "User not found", Constant.STATUS_CODES.PAGE_NOT_FOUND);
      const [library, transactions] = await Promise.all([
        Library.findOne({ userId }).select("games").lean(),
        Transaction.find({ userId }).select("transactionType spentType amount status").lean(),
      ]);
      const successfulPurchases = transactions.filter((tx) => tx.spentType === "purchase" && tx.status === "success");
      const formattedUser = {
        ...user,
        depositCount: transactions.filter((tx) => tx.transactionType === "deposit" && ["success", "refund"].includes(tx.status)).length,
        metrics: {
          totalPurchases: successfulPurchases.length,
          totalSpend: successfulPurchases.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
          gamesOwned: library?.games?.length || 0,
          walletBalance: Number(user.balance) || 0,
          failedTransactions: transactions.filter((tx) => tx.status === "failed").length,
          totalTransactions: transactions.length,
          lifetimeDeposits: transactions.filter((tx) => tx.transactionType === "deposit" && ["success", "refund"].includes(tx.status)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
          lifetimeSpends: transactions.filter((tx) => ["purchase", "withdrawal"].includes(tx.transactionType) && tx.status === "success").reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
        },
      };
      return Response.successResponseData(res, formattedUser, Constant.STATUS_CODES.SUCCESS, "User fetched successfully");
    } catch (error) {
      console.log(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  getUserGames: async (req, res) => {
    try {
      if ((req.role || req.headers["x-user-role"]) !== Constant.ROLE.ADMIN) return Response.errorResponseWithoutData(res, "Admin access required", Constant.STATUS_CODES.FORBIDDEN);
      const { id: userId } = req.params;
      if (!mongoose.isValidObjectId(userId)) return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      const library = await Library.findOne({ userId }).populate({ path: "games.gameId", model: Product, select: "name slug thumbnail price" }).lean();
      const games = (library?.games || []).map((entry) => {
        const product = entry.gameId && typeof entry.gameId === "object" ? entry.gameId : {};
        return {
          id: product._id ? String(product._id) : String(entry.gameId || entry.gameName),
          name: product.name || entry.gameName || "Game",
          thumbnail: product.thumbnail || "",
          purchaseDate: entry.purchaseDate,
          pricePaid: Number(entry.purchasePrice) || 0,
          discountApplied: Number(entry.discountApplied) || 0,
          source: entry.purchaseSource || "purchase",
          status: entry.status || "active",
        };
      });
      return Response.successResponseData(res, games, Constant.STATUS_CODES.SUCCESS, "Owned games fetched");
    } catch (error) {
      console.error(error);
      return Response.errorResponseData(res, "Could not load the user's games", Constant.STATUS_CODES.INTERNAL_SERVER);
    }
  },

  getUserWallet: async (req, res) => {
    try {
      if ((req.role || req.headers["x-user-role"]) !== Constant.ROLE.ADMIN) return Response.errorResponseWithoutData(res, "Admin access required", Constant.STATUS_CODES.FORBIDDEN);
      const { id: userId } = req.params;
      if (!mongoose.isValidObjectId(userId)) return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      const [user, transactions, totals] = await Promise.all([
        Users.findById(userId).select("balance").lean(),
        Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
        Transaction.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId), status: { $in: ["success", "refund"] } } },
          { $group: { _id: "$transactionType", amount: { $sum: "$amount" } } },
        ]),
      ]);
      if (!user) return Response.errorResponseWithoutData(res, "User not found", Constant.STATUS_CODES.PAGE_NOT_FOUND);
      const totalsByType = new Map(totals.map((item) => [item._id, Number(item.amount || 0)]));
      return Response.successResponseData(res, {
        balance: Number(user.balance) || 0,
        lifetimeDeposits: totalsByType.get("deposit") || 0,
        lifetimeSpends: (totalsByType.get("purchase") || 0) + (totalsByType.get("withdrawal") || 0),
        transactions,
      }, Constant.STATUS_CODES.SUCCESS, "User wallet fetched");
    } catch (error) {
      console.error(error);
      return Response.errorResponseData(res, "Could not load the user's wallet", Constant.STATUS_CODES.INTERNAL_SERVER);
    }
  },

  /**
   * @description This function is used to get user transactions
   * @param req
   * @param res
   */
  userTransactions: async (req, res) => {
    try {
      const userId = req.params.id;
      if (!mongoose.isValidObjectId(userId)) return Response.errorResponseWithoutData(res, "Invalid user ID", Constant.STATUS_CODES.BAD_REQUEST);
      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }
      const query = { userId };
      const { status, paymentMethod } = req.query;
      if (["success", "failed", "pending", "cancelled", "refund"].includes(status)) query.status = status;
      if (["razorpay", "stripe", "card", "wallet", "manual"].includes(paymentMethod)) query.paymentMethod = paymentMethod;
      const transactions = await Transaction.find(query).sort({ createdAt: -1 }).populate("gameId", "name").lean();
      return Response.successResponseData(res, transactions.map((tx) => ({ ...tx, game: tx.gameId || null })), Constant.STATUS_CODES.SUCCESS, "User transactions fetched");
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
