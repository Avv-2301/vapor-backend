const Transaction = require("../models/transaction");
const Product = require("../models/Product");
const User = require("../models/auth");

/**
 * @description Aggregates successful game purchases, sales trends, top games, payment methods, and success rate.
 * @param {object} window - Date filter and chart bucket format from getReportWindow.
 * @param {string|null} paymentMethod - Optional payment provider filter.
 * @returns {Promise<object>} Purchase summary, time series, top games, and provider totals.
 */
const getPurchaseReport = async (window, paymentMethod) => {
  const match = {
    spentType: "purchase",
    status: "success",
    gameId: { $ne: null },
    ...window.dateMatch,
    ...(paymentMethod ? { paymentMethod } : {}),
  };
  const period = { $dateToString: { format: window.bucketFormat, date: "$createdAt" } };
  const [totals, series, topGames, methods, attempts] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: "$amount" }, orders: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: period, revenue: { $sum: "$amount" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: "$_id", revenue: 1, orders: 1 } },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$gameId", unitsSold: { $sum: 1 }, revenue: { $sum: "$amount" } } },
      { $sort: { unitsSold: -1, revenue: -1 } },
      { $limit: 10 },
      { $lookup: { from: Product.collection.name, localField: "_id", foreignField: "_id", as: "game" } },
      { $unwind: { path: "$game", preserveNullAndEmptyArrays: true } },
      { $project: {
        _id: 0,
        id: { $toString: "$_id" },
        name: { $ifNull: ["$game.name", "Deleted game"] },
        rating: { $ifNull: ["$game.averageRating", 0] },
        unitsSold: 1,
        revenue: 1,
      } },
    ]),
    Transaction.aggregate([
      { $match: { ...match, paymentMethod: paymentMethod || { $in: ["razorpay", "stripe"] } } },
      { $group: { _id: "$paymentMethod", amount: { $sum: "$amount" }, orders: { $sum: 1 } } },
    ]),
    Transaction.countDocuments({
      spentType: "purchase",
      gameId: { $ne: null },
      ...window.dateMatch,
      ...(paymentMethod ? { paymentMethod } : {}),
    }),
  ]);
  const revenue = totals[0]?.revenue || 0;
  const orders = totals[0]?.orders || 0;
  const paymentMethods = ["razorpay", "stripe"].map((method) => {
    const record = methods.find((item) => item._id === method);
    return { method, amount: record?.amount || 0, orders: record?.orders || 0 };
  });
  return {
    summary: {
      revenue,
      orders,
      purchaseAttempts: attempts,
      averageOrderValue: orders ? revenue / orders : 0,
      purchaseSuccessRate: attempts ? (orders / attempts) * 100 : 0,
      providerTaggedRevenue: paymentMethods.reduce((sum, item) => sum + item.amount, 0),
    },
    series,
    topGames,
    paymentMethods,
  };
};

/**
 * @description Aggregates successful Razorpay or Stripe deposits and their revenue trend.
 * @param {object} window - Date filter and chart bucket format from getReportWindow.
 * @param {string|null} paymentMethod - Optional payment provider filter.
 * @returns {Promise<object>} Revenue summary, time series, and provider totals.
 */
const getRevenueReport = async (window, paymentMethod) => {
  const match = {
    transactionType: "deposit",
    status: "success",
    paymentMethod: paymentMethod || { $in: ["razorpay", "stripe"] },
    ...window.dateMatch,
  };
  const [totals, series, methods] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: "$amount" }, orders: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: window.bucketFormat, date: "$createdAt" } },
        revenue: { $sum: "$amount" },
        orders: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: "$_id", revenue: 1, orders: 1 } },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$paymentMethod", amount: { $sum: "$amount" }, orders: { $sum: 1 } } },
    ]),
  ]);
  const revenue = totals[0]?.revenue || 0;
  const orders = totals[0]?.orders || 0;
  return {
    summary: {
      revenue,
      orders,
      averageOrderValue: orders ? revenue / orders : 0,
      providerTaggedRevenue: revenue,
    },
    series,
    paymentMethods: ["razorpay", "stripe"].map((method) => {
      const record = methods.find((item) => item._id === method);
      return { method, amount: record?.amount || 0, orders: record?.orders || 0 };
    }),
  };
};

/**
 * @description Counts users, registrations, logins, and verified accounts in the selected range.
 * @param {object} window - Date filter and chart bucket format from getReportWindow.
 * @returns {Promise<object>} User summary and registration/login time series.
 */
const getUserReport = async (window) => {
  const base = { role: "user", status: { $ne: "2" } };
  const lastLoginMatch = window.start
    ? { last_login: { $gte: window.start, $lte: window.end } }
    : { last_login: { $ne: null } };
  const verifiedMatch = window.start
    ? { verifiedAt: { $gte: window.start, $lte: window.end } }
    : {};
  const [totalUsers, newUsers, activeUsers, verifiedUsers, registrations, logins] = await Promise.all([
    User.countDocuments(base),
    User.countDocuments({ ...base, ...window.dateMatch }),
    User.countDocuments({ ...base, ...lastLoginMatch }),
    User.countDocuments({ ...base, verified: true, ...verifiedMatch }),
    User.aggregate([
      { $match: { ...base, ...window.dateMatch } },
      { $group: { _id: { $dateToString: { format: window.bucketFormat, date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    User.aggregate([
      { $match: { ...base, ...lastLoginMatch } },
      { $group: { _id: { $dateToString: { format: window.bucketFormat, date: "$last_login" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const periods = [...new Set([...registrations, ...logins].map((item) => item._id))].sort();
  const registrationMap = new Map(registrations.map((item) => [item._id, item.count]));
  const loginMap = new Map(logins.map((item) => [item._id, item.count]));
  return {
    summary: { totalUsers, newUsers, activeUsers, verifiedUsers },
    series: periods.map((period) => ({
      period,
      registrations: registrationMap.get(period) || 0,
      activeUsers: loginMap.get(period) || 0,
    })),
  };
};

/**
 * @description Summarizes active games and completed game purchases, including the most sold games.
 * @param {object} window - Date filter and chart bucket format from getReportWindow.
 * @param {string|null} paymentMethod - Optional payment provider filter.
 * @returns {Promise<object>} Game summary and top-selling games.
 */
const getGameReport = async (window, paymentMethod) => {
  const purchases = await getPurchaseReport(window, paymentMethod);
  const totalGames = await Product.countDocuments({ isActive: true });
  return {
    summary: {
      totalGames,
      unitsSold: purchases.summary.orders,
      gameRevenue: purchases.summary.revenue,
      mostSoldGame: purchases.topGames[0]?.name || null,
    },
    topGames: purchases.topGames,
  };
};

module.exports = { getPurchaseReport, getRevenueReport, getUserReport, getGameReport };
