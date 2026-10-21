const express = require("express");
const { createAuditLogger } = require("@avv-2301/gamers-vault-common");
const AuditLog = require("../../models/auditLog");
const {
  login,
  logout,
  getLoginHistory,
  updatePassword,
  getSession,
} = require("../../controllers/app/auth");
const { getDashboardStats, searchDashboard } = require("../../controllers/app/dashboard");
const { getReport } = require("../../controllers/app/reports");
const {
  getAuditLogs,
  getAuditLogStats,
} = require("../../controllers/app/auditLog");
const {
  createGame,
  getAllGames,
  getGameById,
  getGameBySlug,
  updateGame,
  deleteGame,
  gameVisibility,
} = require("../../controllers/app/gameController");
const {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  pauseBanner,
  resumeBanner,
} = require("../../controllers/app/bannerController");
const { userAuth } = require("../../middleware/userAuth");
const { uploadImage } = require("../../controllers/app/mediaController");
const {
  getAllUsers,
  getUserById,
  getUserGames,
  getUserWallet,
  userTransactions,
  resetUserPassword,
  forceLogoutUser,
} = require("../../controllers/app/users");
const {
  addBalance,
  deductBalance,
  getAllTransactions,
} = require("../../controllers/app/transactions");
const {
  createGiftCard,
  getAllGiftCards,
  getGiftCardById,
  updateGiftCard,
  deleteGiftCard,
} = require("../../controllers/app/giftCardController");
const { createDiscount, getAllDiscounts, getDiscountById, updateDiscount, getDiscountOptions, setDiscountPaused, deleteDiscount, bulkDiscountAction } = require("../../controllers/app/discountController");
const router = express.Router();

router.post("/login", login);
router.use(userAuth);
router.use(createAuditLogger((data) => AuditLog.create(data)));
router.post("/upload-image", uploadImage);
router.get("/session", getSession);
router.post("/logout", logout);
router.get("/login-history/:userId", getLoginHistory);
router.put("/change-password/:userId", updatePassword);

//dashboard routes
router.get("/dashboard/stats", getDashboardStats);
router.get("/dashboard/search", searchDashboard);
router.get("/reports/:type", getReport);

// Audit log routes
router.get("/audit-logs", getAuditLogs);
router.get("/audit-logs/stats", getAuditLogStats);

// Game routes
router.post("/games", createGame);
router.get("/games", getAllGames);
router.get("/games/slug/:slug", getGameBySlug);
router.get("/games/:id", getGameById);
router.put("/games/:id", updateGame);
router.delete("/games/:id", deleteGame);
router.put("/game-visibility/:id", gameVisibility);

// Banner routes
router.post("/banners", createBanner);
router.get("/banners", getAllBanners);
router.get("/banners/:id", getBannerById);
router.put("/banners/:id", updateBanner);
router.put("/banners/:id/pause", pauseBanner);
router.put("/banners/:id/resume", resumeBanner);
router.delete("/banners/:id", deleteBanner);

//users routes
router.get("/get-users", getAllUsers);
router.get("/get-user/:id", getUserById);
router.get("/get-user/:id/games", getUserGames);
router.get("/get-user/:id/wallet", getUserWallet);
router.put("/users/:id/password", resetUserPassword);
router.post("/users/:id/logout", forceLogoutUser);
router.get("/transaction/:id", userTransactions);

//transaction routes
router.post("/add-balance/:id", addBalance);
router.post("/deduct-balance/:id", deductBalance);
router.get("/transactions", getAllTransactions);

// Gift card batches
router.post("/gift-cards", createGiftCard);
router.get("/gift-cards", getAllGiftCards);
router.get("/gift-cards/:id", getGiftCardById);
router.put("/gift-cards/:id", updateGiftCard);
router.delete("/gift-cards/:id", deleteGiftCard);

// Discounts
router.post("/discounts", createDiscount);
router.get("/discounts", getAllDiscounts);
router.get("/discounts/options", getDiscountOptions);
router.post("/discounts/bulk-action", bulkDiscountAction);
router.get("/discounts/:id", getDiscountById);
router.put("/discounts/:id", updateDiscount);
router.put("/discounts/:id/pause", setDiscountPaused);
router.delete("/discounts/:id", deleteDiscount);

module.exports = router;
