const Product = require("../models/Product");
const Discount = require("../models/discount");
const User = require("../models/auth");
const Transaction = require("../models/transaction");
const AuditLog = require("../models/auditLog");
const { escapeRegex } = require("./helper");

/**
 * @description Builds dashboard counts, payment revenue, chart series, recent transactions, and admin activity.
 * @param {object} window - Date filter and chart bucket format from getReportWindow.
 * @returns {Promise<object>} Dashboard metrics, series, transactions, and activity for the selected range.
 */
const getDashboardData = async (window) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const paymentMatch = {
    transactionType: "deposit",
    status: "success",
    paymentMethod: { $in: ["razorpay", "stripe"] },
  };
  const period = {
    $dateToString: { format: window.bucketFormat, date: "$createdAt" },
  };
  const [
    totalGames,
    activeGames,
    activeDiscounts,
    totalUsers,
    activeUsersToday,
    todayPayments,
    rangePayments,
    revenueSeries,
    transactionSeries,
    recentTransactions,
    recentLogs,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ isActive: true }),
    Discount.countDocuments({
      scope: { $in: ["game", "category"] },
      isPaused: { $ne: true },
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
    User.countDocuments({ role: "user", status: { $ne: "2" } }),
    User.countDocuments({
      role: "user",
      status: { $ne: "2" },
      last_login: { $gte: today, $lte: now },
    }),
    Transaction.aggregate([
      { $match: { ...paymentMatch, createdAt: { $gte: today, $lte: now } } },
      {
        $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } },
      },
    ]),
    Transaction.aggregate([
      { $match: { ...paymentMatch, ...window.dateMatch } },
      {
        $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } },
      },
    ]),
    Transaction.aggregate([
      { $match: { ...paymentMatch, ...window.dateMatch } },
      { $group: { _id: period, revenue: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: "$_id", revenue: 1 } },
    ]),
    Transaction.aggregate([
      { $match: window.dateMatch },
      { $group: { _id: period, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: "$_id", count: 1 } },
    ]),
    Transaction.find(window.dateMatch)
      .sort({ createdAt: -1 })
      .limit(20)
      .select(
        "orderId userId gameId amount status transactionType spentType createdAt"
      )
      .populate({
        path: "userId",
        select: "name email profile",
        populate: { path: "profile", select: "profilePhoto" },
      })
      .populate("gameId", "name")
      .lean(),
    AuditLog.find({
      ...window.dateMatch,
      userRole: "admin",
      method: { $ne: "GET" },
      responseStatus: { $gte: 200, $lt: 400 },
      endpoint: { $not: /audit-logs/ },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("method endpoint action userId createdAt")
      .populate("userId", "name email")
      .lean(),
  ]);

  const periodRevenue = rangePayments[0]?.amount || 0;
  const paymentCount = rangePayments[0]?.count || 0;
  return {
    range: window.range,
    startDate: window.start,
    endDate: window.end,
    metrics: {
      totalGames,
      activeGames,
      activeDiscounts,
      revenueToday: todayPayments[0]?.amount || 0,
      revenueInRange: periodRevenue,
      totalUsers,
      activeUsersToday,
      averageTransaction: paymentCount ? periodRevenue / paymentCount : 0,
      paymentCount,
    },
    revenueSeries,
    transactionSeries,
    recentTransactions: recentTransactions.map((item) => ({
      id: String(item._id),
      orderId: item.orderId,
      user: {
        name: item.userId?.name || "Deleted user",
        email: item.userId?.email || "",
        profilePhoto: item.userId?.profile?.profilePhoto || null,
      },
      game:
        item.gameId?.name ||
        (item.spentType === "top-up"
          ? "Wallet top-up"
          : item.transactionType === "withdrawal"
          ? "Wallet withdrawal"
          : item.transactionType === "purchase"
          ? "Wallet purchase"
          : "—"),
      amount: item.amount,
      status: item.status,
      createdAt: item.createdAt,
    })),
    recentActivity: recentLogs.map((item) => ({
      id: String(item._id),
      title: item.action || `${item.method} ${item.endpoint}`,
      description: item.endpoint,
      actor: item.userId?.name || item.userId?.email || "Admin",
      createdAt: item.createdAt,
      method: item.method,
    })),
  };
};

/**
 * @description Finds matching games, users, and transaction order IDs for the dashboard search.
 * @param {string} query - Search text, already trimmed and length-limited by the controller.
 * @returns {Promise<object[]>} Search results with labels, resource types, and admin page paths.
 */
const searchDashboard = async (query) => {
  const expression = new RegExp(escapeRegex(query), "i");
  const [games, users, transactions] = await Promise.all([
    Product.find({ name: expression }).select("name slug").limit(5).lean(),
    User.find({
      role: "user",
      status: { $ne: "2" },
      $or: [{ name: expression }, { email: expression }],
    })
      .select("name email")
      .limit(5)
      .lean(),
    Transaction.find({ orderId: expression })
      .sort({ createdAt: -1 })
      .select("orderId")
      .limit(5)
      .lean(),
  ]);
  return [
    ...games.map((item) => ({
      id: String(item._id),
      label: item.name,
      type: "Game",
      path: `/dashboard/games/${encodeURIComponent(item.slug)}`,
    })),
    ...users.map((item) => ({
      id: String(item._id),
      label: item.name,
      detail: item.email,
      type: "User",
      path: `/dashboard/users/${item._id}`,
    })),
    ...transactions.map((item) => ({
      id: String(item._id),
      label: item.orderId,
      type: "Transaction",
      path: "/dashboard/transactions",
    })),
  ];
};

module.exports = { getDashboardData, searchDashboard };
