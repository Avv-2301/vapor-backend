const User = require("../../models/auth");
const Transaction = require("../../models/transaction");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const bcrypt = require("bcrypt");
const {
  addWalletBalanceValidation,
  deductWalletBalanceValidation,
} = require("../../services/Validation");
const { generateOrderId } = require("../../services/helper");

module.exports = {
  /**
   * @description This function is used to add Money to user wallet
   * @param req
   * @param res
   */
  addBalance: async (req, res) => {
    try {
      const { amount, confirmAmount, password, reason } = req.body;
      const userId = req.params.id;

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User Id not found",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      addWalletBalanceValidation(req, res, async (validate) => {
        if (!validate) return;

        if (!amount || amount <= 0) {
          return Response.errorResponseWithoutData(
            res,
            "Amount should be greater than 0",
            Constant.STATUS_CODES.NOT_ACCEPTABLE
          );
        }

        if (amount !== confirmAmount) {
          return Response.errorResponseWithoutData(
            res,
            "Amount and confirm amount do not match",
            Constant.STATUS_CODES.NOT_ACCEPTABLE
          );
        }

        const admin = await User.findOne({ role: Constant.ROLE.ADMIN });
        if (!admin) {
          return Response.errorResponseWithoutData(
            res,
            "Admin not found",
            Constant.STATUS_CODES.NOT_FOUND
          );
        }

        const comparePassword = await bcrypt.compare(password, admin.password);
        if (!comparePassword) {
          return Response.errorResponseWithoutData(
            res,
            "Invalid admin password",
            Constant.STATUS_CODES.UNAUTHORIZED
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return Response.errorResponseWithoutData(
            res,
            "User not found",
            Constant.STATUS_CODES.NOT_FOUND
          );
        }

        // Increment balance safely
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { balance: Number(amount) } },
          { new: true }
        );

        const orderId = generateOrderId();

        const transactionObj = {
          userId: updatedUser?._id,
          orderId: orderId,
          transactionType: Constant?.TRANSACTION_TYPE?.DEPOSIT || "deposit",
          spentType: Constant?.SPENT_TYPE?.TOPUP || "top-up",
          paymentMethod: Constant?.PAYMENT_METHOD?.MANUAL || "manual",
          amount: amount,
          status: Constant?.TRANSACTION_STATUS?.SUCCESS || "success",
          reason: reason,
        };

        await Transaction.create(transactionObj);

        return Response.successResponseData(
          res,
          updatedUser,
          Constant?.STATUS_CODES?.SUCCESS,
          "Balance added successfully"
        );
      });
    } catch (error) {
      console.error(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to deduct balance from user wallet dirctly
   * @param req
   * @param res
   */
  deductBalance: async (req, res) => {
    try {
      const { amount, confirmAmount, password, reason } = req.body;
      const userId = req.params.id;

      if (!userId) {
        return Response.errorResponseWithoutData(
          res,
          "User Id not found",
          Constant.STATUS_CODES.NO_CONTENT
        );
      }

      const role = req.role || req.headers["x-user-role"];
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      deductWalletBalanceValidation(req, res, async (validate) => {
        if (!validate) return;

        if (!amount || amount <= 0) {
          return Response.errorResponseWithoutData(
            res,
            "Amount should be greater than 0",
            Constant.STATUS_CODES.NOT_ACCEPTABLE
          );
        }

        if (amount !== confirmAmount) {
          return Response.errorResponseWithoutData(
            res,
            "Amount and confirm amount do not match",
            Constant.STATUS_CODES.NOT_ACCEPTABLE
          );
        }

        const admin = await User.findOne({ role: Constant.ROLE.ADMIN });
        if (!admin) {
          return Response.errorResponseWithoutData(
            res,
            "Admin not found",
            Constant.STATUS_CODES.NOT_FOUND
          );
        }

        const comparePassword = await bcrypt.compare(password, admin.password);
        if (!comparePassword) {
          return Response.errorResponseWithoutData(
            res,
            "Invalid admin password",
            Constant.STATUS_CODES.UNAUTHORIZED
          );
        }

        const user = await User.findById(userId);
        if (!user) {
          return Response.errorResponseWithoutData(
            res,
            "User not found",
            Constant.STATUS_CODES.NOT_FOUND
          );
        }

        //Decrement balance safely
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { $inc: { balance: Number(-amount) } },
          { new: true }
        );

        const orderId = generateOrderId();

        const transactionObj = {
          userId: updatedUser?._id,
          orderId: orderId,
          transactionType:
            Constant?.TRANSACTION_TYPE?.WITHDRAWAL || "withdrawal",
          paymentMethod: Constant?.PAYMENT_METHOD?.MANUAL || "manual",
          amount: amount,
          status: Constant?.TRANSACTION_STATUS?.SUCCESS || "success",
          reason: reason,
        };

        await Transaction.create(transactionObj);

        return Response.successResponseData(
          res,
          updatedUser,
          Constant?.STATUS_CODES?.SUCCESS,
          "Balance added successfully"
        );
      });
    } catch (error) {
      console.error(error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get all transactions
   * @param req
   * @param res
   */
  getAllTransactions: async (req, res) => {
    try {
      const role = req.role || req.headers["x-user-role"];
      if (!role) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      let {
        page = 1,
        limit = 10,
        search,
        spentType,
        status,
        paymentMethod,
        minAmount,
        transactionType,
        maxAmount,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const query = {};

      if (
        ["success", "failed", "pending", "cancelled", "refund"].includes(status)
      ) {
        query.status = status;
      }

      //to search transactions
      if (search) {
        query.$text = { $search: search };
      }

      if (spentType) {
        if (["purchase", "top-up", "refund"].includes(spentType)) {
          query.spentType = spentType;
        }
      }

      //minAmount and maxAmount
      if (minAmount || maxAmount) {
        query.amount = {};
        if (minAmount) query.amount.$gte = parseFloat(minAmount);
        if (maxAmount) query.amount.$lte = parseFloat(maxAmount);
      }

      if (paymentMethod) {
        if (["card", "manual", "wallet", "stripe", "razorpay"].includes(paymentMethod)) {
          query.paymentMethod = paymentMethod;
        }
      }

      if (transactionType) {
        if (["deposit", "withdrawal", "purchase"].includes(transactionType)) {
          query.transactionType = transactionType;
        }
      }

      const sortOptions = {};
      if (sortBy === "amount") {
        sortOptions.amount = sortOrder === "asc" ? 1 : -1;
      } else {
        sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const totalDocuments = await Transaction.countDocuments(query);

      const transactions = await Transaction.find(query)
        .populate({
          path: "userId",
          select: "name email profile",
          populate: {
            path: "profile",
            select: "profilePhoto",
          },
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .select("-__v");

      //total Revenue
      const result = await Transaction.aggregate([
        {
          $match: {
            transactionType: Constant.TRANSACTION_TYPE.DEPOSIT || "deposit",
          },
        },
        {
          $group: {
            _id: null,
            totalDeposit: { $sum: "$amount" },
          },
        },
      ]);
      const totalRevenue = result[0]?.totalDeposit || 0;

      //transaction today
      const transactionToday = await Transaction.aggregate([
        {
          $match: {
            transactionType: Constant.TRANSACTION_TYPE.DEPOSIT || "deposit",
            createdAt: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDepositToday: { $sum: "$amount" },
          },
        },
      ]);
      const todayTransaction = transactionToday[0]?.totalDepositToday || 0;

      //successfull Payments
      const successPayments = await Transaction.countDocuments({
        status: Constant?.TRANSACTION_STATUS.SUCCESS,
      });

      //Failed Payments
      const failedPayments = await Transaction.countDocuments({
        status: Constant?.TRANSACTION_STATUS.FAILED,
      });

      //refund Issued
      const refunds = await Transaction.countDocuments({
        status: Constant?.TRANSACTION_STATUS.REFUND,
      });

      //wallet top-ups
      const topUps = await Transaction.countDocuments({
        spentType: Constant.SPENT_TYPE.TOPUP,
      });

      return Response.successResponseData(
        res,
        {
          transactions,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalDocuments / parseInt(limit)),
            totalDocuments,
          },
          totalRevenue,
          todayTransaction,
          successPayments,
          failedPayments,
          refunds,
          topUps,
        },
        Constant.STATUS_CODES.SUCCESS,
        "Transaction Found Successfully"
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
};
