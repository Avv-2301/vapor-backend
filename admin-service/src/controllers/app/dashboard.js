const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const { getReportWindow } = require("../../services/helper");
const {
  getDashboardData,
  searchDashboard,
} = require("../../services/dashboardService");

module.exports = {
  /**
   * @description Retrieves dashboard metrics, chart series, recent transactions, and admin activity for a date range.
   * @param req
   * @param res
   */
  getDashboardStats: async (req, res) => {
    try {
      const userId = req.authUserId || req.headers["x-user-id"];
      const role = req.role || req.headers["x-user-role"];
      if (!userId)
        return Response.errorResponseWithoutData(
          res,
          "Authentication required",
          Constant.STATUS_CODES.UNAUTHORIZED
        );
      if (role !== Constant.ROLE.ADMIN)
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      const window = getReportWindow(req.query);
      if (window.error)
        return Response.errorResponseWithoutData(
          res,
          window.error,
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const data = await getDashboardData(window);
      return Response.successResponseData(
        res,
        data,
        Constant.STATUS_CODES.SUCCESS,
        "Dashboard statistics retrieved successfully"
      );
    } catch (error) {
      console.error("Dashboard statistics error:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
  /**
   * @description Searches games, users, and transaction order IDs for the dashboard header.
   * @param req
   * @param res
   */
  searchDashboard: async (req, res) => {
    try {
      if ((req.role || req.headers["x-user-role"]) !== Constant.ROLE.ADMIN) {
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      }
      const query = String(req.query.q || "")
        .trim()
        .slice(0, 100);
      if (query.length < 2)
        return Response.successResponseData(
          res,
          [],
          Constant.STATUS_CODES.SUCCESS,
          "Search results retrieved"
        );
      const results = await searchDashboard(query);
      return Response.successResponseData(
        res,
        results,
        Constant.STATUS_CODES.SUCCESS,
        "Search results retrieved"
      );
    } catch (error) {
      console.error("Dashboard search error:", error);
      return Response.errorResponseData(
        res,
        error.message,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
