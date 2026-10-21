const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const { getReportWindow } = require("../../services/helper");
const {
  getPurchaseReport,
  getRevenueReport,
  getUserReport,
  getGameReport,
} = require("../../services/reportService");

module.exports = {
  /**
   * @description Generates the requested sales, revenue, user, or game report for a date range and payment method.
   * @param req
   * @param res
   */
  getReport: async (req, res) => {
    try {
      if (req.role !== Constant.ROLE.ADMIN)
        return Response.errorResponseWithoutData(
          res,
          "Admin access required",
          Constant.STATUS_CODES.FORBIDDEN
        );
      const { type } = req.params;
      if (!["sales", "revenue", "users", "games"].includes(type))
        return Response.errorResponseWithoutData(
          res,
          "Invalid report type",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const requestedPaymentMethod = req.query.paymentMethod || "all";
      if (!["all", "razorpay", "stripe"].includes(requestedPaymentMethod))
        return Response.errorResponseWithoutData(
          res,
          "Invalid payment method",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const paymentMethod = type === "users" ? "all" : requestedPaymentMethod;
      const window = getReportWindow(req.query);
      if (window.error)
        return Response.errorResponseWithoutData(
          res,
          window.error,
          Constant.STATUS_CODES.BAD_REQUEST
        );

      const report =
        type === "users"
          ? await getUserReport(window)
          : type === "games"
          ? await getGameReport(
              window,
              paymentMethod === "all" ? null : paymentMethod
            )
          : type === "revenue"
          ? await getRevenueReport(
              window,
              paymentMethod === "all" ? null : paymentMethod
            )
          : await getPurchaseReport(
              window,
              paymentMethod === "all" ? null : paymentMethod
            );
      return Response.successResponseData(
        res,
        {
          type,
          range: window.range,
          startDate: window.start,
          endDate: window.end,
          paymentMethod,
          ...report,
        },
        Constant.STATUS_CODES.SUCCESS,
        "Report retrieved successfully"
      );
    } catch (error) {
      return Response.errorResponseData(
        res,
        error.message || "Internal Server Error",
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
