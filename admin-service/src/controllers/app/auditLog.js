const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const AuditLog = require("../../models/auditLog");
const User = require("../../models/auth");

const { escapeRegex } = require("../../services/helper");

const resourcePatterns = {
  settings: "settings|config",
  users: "users?|profiles?",
  games: "games?",
  transactions: "transactions?|balance|wallet",
  discounts: "discounts?",
  banners: "banners?",
  security: "security|roles?|permissions?|auth",
  system: "system|health|reports?",
};

module.exports = {
  /**
   * @description This function is used to get audit logs with filtering and pagination
   * @param req
   * @param res
   */
  getAuditLogs: async (req, res) => {
    try {
      const role = req.role || req.headers["x-user-role"];

      // Check admin role
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      // Get query parameters
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit, 10) || 10)
      );
      const skip = (page - 1) * limit;
      const writeMethods = ["POST", "PUT", "PATCH", "DELETE"];
      const filter = { method: { $in: writeMethods }, userRole: Constant.ROLE.ADMIN };
      const clauses = [];

      if (req.query.userId) {
        filter.userId = req.query.userId;
      }

      const actionMethods = {
        create: "POST",
        update: { $in: ["PUT", "PATCH"] },
        delete: "DELETE",
      };
      if (actionMethods[req.query.actionType]) {
        filter.method = actionMethods[req.query.actionType];
      }

      if (req.query.resourceType && resourcePatterns[req.query.resourceType]) {
        filter.endpoint = {
          $regex: resourcePatterns[req.query.resourceType],
          $options: "i",
        };
      }

      if (req.query.responseStatus) {
        const responseStatus = parseInt(req.query.responseStatus, 10);
        if (Number.isFinite(responseStatus))
          filter.responseStatus = responseStatus;
      } else if (req.query.status === "success") {
        filter.responseStatus = { $gte: 200, $lt: 400 };
      } else if (req.query.status === "failed") {
        filter.responseStatus = { $gte: 400, $lt: 500 };
      } else if (req.query.status === "warning") {
        filter.responseStatus = { $gte: 500 };
      }

      if (req.query.startDate || req.query.endDate) {
        filter.createdAt = {};
        if (req.query.startDate) {
          const startDate = new Date(req.query.startDate);
          if (!Number.isNaN(startDate.getTime()))
            filter.createdAt.$gte = startDate;
        }
        if (req.query.endDate) {
          const endDate = new Date(req.query.endDate);
          if (!Number.isNaN(endDate.getTime())) filter.createdAt.$lte = endDate;
        }
        if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
      }

      const userSearch = req.query.user?.trim();
      if (userSearch && userSearch !== "all") {
        const userRegex = new RegExp(escapeRegex(userSearch), "i");
        const matchingUsers = await User.find({
          $or: [{ name: userRegex }, { email: userRegex }],
        }).distinct("_id");
        clauses.push({ userId: { $in: matchingUsers } });
      }

      const search = req.query.search?.trim();
      if (search) {
        const regex = new RegExp(escapeRegex(search), "i");
        const matchingUsers = await User.find({
          $or: [{ name: regex }, { email: regex }],
        }).distinct("_id");
        const searchConditions = [
          { endpoint: regex },
          { fullUrl: regex },
          { method: regex },
          { ipAddress: regex },
          { userAgent: regex },
        ];
        if (matchingUsers.length)
          searchConditions.push({ userId: { $in: matchingUsers } });
        clauses.push({ $or: searchConditions });
      }

      if (clauses.length) filter.$and = clauses;

      // Get audit logs with pagination
      const auditLogs = await AuditLog.find(filter)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const totalCount = await AuditLog.countDocuments(filter);

      return Response.successResponseData(
        res,
        {
          auditLogs,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit,
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Audit logs retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting audit logs:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description This function is used to get audit log statistics
   * @param req
   * @param res
   */
  getAuditLogStats: async (req, res) => {
    try {
      const role = req.role || req.headers["x-user-role"];

      // Check admin role
      if (role !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }

      const endDate = new Date();
      const requestedEndDate = req.query.endDate
        ? new Date(req.query.endDate)
        : endDate;
      const rangeEnd = Number.isNaN(requestedEndDate.getTime())
        ? endDate
        : requestedEndDate;
      const requestedStartDate = req.query.startDate
        ? new Date(req.query.startDate)
        : null;
      const startDate =
        requestedStartDate && !Number.isNaN(requestedStartDate.getTime())
          ? requestedStartDate
          : new Date(rangeEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateFilter = {
        method: { $in: ["POST", "PUT", "PATCH", "DELETE"] },
        userRole: Constant.ROLE.ADMIN,
        createdAt: { $gte: startDate, $lte: rangeEnd },
      };
      const [
        totalLogs,
        todayLogs,
        successfulLogs,
        failedLogs,
        settingsChanges,
      ] = await Promise.all([
        AuditLog.countDocuments(dateFilter),
        AuditLog.countDocuments({
          method: { $in: ["POST", "PUT", "PATCH", "DELETE"] },
          userRole: Constant.ROLE.ADMIN,
          createdAt: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
            $lte: rangeEnd,
          },
        }),
        AuditLog.countDocuments({
          ...dateFilter,
          responseStatus: { $gte: 200, $lt: 400 },
        }),
        AuditLog.countDocuments({
          ...dateFilter,
          responseStatus: { $gte: 400 },
        }),
        AuditLog.countDocuments({
          ...dateFilter,
          endpoint: { $regex: resourcePatterns.settings, $options: "i" },
        }),
      ]);

      const logsByMethod = await AuditLog.aggregate([
        {
          $match: {
            method: { $in: ["POST", "PUT", "PATCH", "DELETE"] },
            userRole: Constant.ROLE.ADMIN,
            createdAt: { $gte: startDate, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: "$method",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const logsByStatus = await AuditLog.aggregate([
        {
          $match: {
            method: { $in: ["POST", "PUT", "PATCH", "DELETE"] },
            userRole: Constant.ROLE.ADMIN,
            createdAt: { $gte: startDate, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: "$responseStatus",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const logsByRole = await AuditLog.aggregate([
        {
          $match: {
            method: { $in: ["POST", "PUT", "PATCH", "DELETE"] },
            userRole: Constant.ROLE.ADMIN,
            createdAt: { $gte: startDate, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: "$userRole",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]);

      return Response.successResponseData(
        res,
        {
          totalLogs,
          todayLogs,
          successfulLogs,
          failedLogs,
          settingsChanges,
          logsByMethod,
          logsByStatus,
          logsByRole,
          dateRange: {
            startDate,
            endDate: rangeEnd,
          },
        },
        Constant.STATUS_CODES.SUCCESS,
        "Audit log statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Error getting audit log stats:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
