const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const User = require("../models/auth");
const Product = require("../models/Product");

const bannerPositions = [
  "homepage-hero",
  "homepage-featured",
  "homepage-sidebar",
  "category-header",
  "game-page",
];
const bannerStatuses = ["active", "scheduled", "expired", "disabled"];
const MAX_GIFT_CARD_QUANTITY = 100;

/**
 * @description Validates a gift card batch's amount, quantity, expiry, prefix, notes, and image.
 * @param {object} data - Gift card batch input.
 * @returns {string|null} A validation message, or null when the input is valid.
 */
const validateGiftCard = (data = {}) => {
  const amount = Number(data.amount);
  const quantity = Number(data.quantity);
  if (!Number.isFinite(amount) || amount < 0.01)
    return "Gift card amount must be greater than zero";
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_GIFT_CARD_QUANTITY
  )
    return `Quantity must be between 1 and ${MAX_GIFT_CARD_QUANTITY}`;
  if (data.expiresAt && Number.isNaN(new Date(data.expiresAt).getTime()))
    return "Enter a valid expiration date";
  if (
    data.codePrefix !== undefined &&
    (typeof data.codePrefix !== "string" || data.codePrefix.trim().length > 24)
  )
    return "Code prefix must be 24 characters or fewer";
  if (
    data.notes !== undefined &&
    (typeof data.notes !== "string" || data.notes.length > 500)
  )
    return "Notes must be 500 characters or fewer";
  if (data.image !== undefined && data.image !== null && data.image !== "") {
    try {
      const imageUrl = new URL(data.image);
      if (
        !["http:", "https:"].includes(imageUrl.protocol) ||
        data.image.length > 2048
      )
        return "Gift card image must be a valid HTTP or HTTPS URL";
    } catch {
      return "Gift card image must be a valid HTTP or HTTPS URL";
    }
  }
  return null;
};

/**
 * @description Converts a gift card prefix to a safe uppercase code prefix.
 * @param {string} prefix - Requested prefix.
 * @returns {string} The normalized prefix, defaulting to GAMER.
 */
const normalizeGiftCardPrefix = (prefix) =>
  (prefix || "GAMER")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 24) || "GAMER";

/**
 * @description Creates one gift card code with a random hexadecimal suffix.
 * @param {string} prefix - Normalized code prefix.
 * @returns {string} A gift card code.
 */
const generateGiftCardCode = (prefix) =>
  `${prefix}-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;

/**
 * @description Creates the requested number of gift card code records.
 * @param {number} quantity - Number of codes to generate.
 * @param {string} prefix - Normalized code prefix.
 * @returns {Array<{code: string}>} Generated code records.
 */
const generateGiftCardCodes = (quantity, prefix) =>
  Array.from({ length: quantity }, () => ({
    code: generateGiftCardCode(prefix),
  }));

/**
 * @description Builds a gift card batch response with its generated codes and inventory status.
 * @param {object} giftCard - Gift card batch document or plain object.
 * @returns {object} Batch details, a code preview, inventory counts, and status.
 */
const serializeGiftCard = (giftCard) => {
  const codes = giftCard.codes || [];
  const { codes: _codes, ...giftCardData } = giftCard;
  const redeemedQuantity = codes.filter(
    (code) => code.redeemedAt || code.redeemedBy
  ).length;
  const isExpired =
    giftCard.expiresAt && new Date(giftCard.expiresAt) < new Date();
  const status =
    redeemedQuantity === codes.length
      ? "redeemed"
      : isExpired
      ? "expired"
      : "active";
  const firstCode = codes[0]?.code || "";
  return {
    ...giftCardData,
    id: String(giftCard._id),
    code: firstCode,
    codes: codes.map((entry) => ({
      code: entry.code,
      redeemed: Boolean(entry.redeemedAt || entry.redeemedBy),
      redeemedAt: entry.redeemedAt || null,
    })),
    quantity: codes.length,
    generatedQuantity: codes.length,
    redeemedQuantity,
    availableQuantity: codes.length - redeemedQuantity,
    status,
    redeemedBy: null,
    redeemedAt: null,
  };
};

/**
 * @description Converts a game name to a lowercase URL slug.
 * @param {string} name - Game name.
 * @returns {string} URL slug.
 */
const generateSlug = (name) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * @description Generates a random uppercase hexadecimal order ID.
 * @returns {string} Order ID.
 */
const generateOrderId = () =>
  crypto.randomBytes(8).toString("hex").toUpperCase();

/**
 * @description Escapes regular expression metacharacters in a search value.
 * @param {string} value - Literal search text.
 * @returns {string} Text safe to use in a regular expression.
 */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @description Calculates the percentage reduction from a regular price to a discount price.
 * @param {number} price - Regular price.
 * @param {number} discountPrice - Discounted price.
 * @returns {number} Rounded discount percentage.
 */
const calculateDiscountPercentage = (price, discountPrice) =>
  Math.round(((price - discountPrice) / price) * 100);

/**
 * @description Resolves a report or dashboard range into date filters and a chart bucket format.
 * @param {object} query - Range and optional custom startDate/endDate values.
 * @param {Date} now - Reference time for relative ranges.
 * @returns {object} Range details and MongoDB date filter, or an error message.
 */
const getReportWindow = (query = {}, now = new Date()) => {
  const range = query.range || "all";
  const days = { "7D": 7, "30D": 30, "90D": 90, "365D": 365 };
  if (range !== "all" && range !== "custom" && !days[range])
    return { error: "Invalid report range" };
  let start = null;
  let end = now;
  if (range === "custom") {
    start = new Date(query.startDate);
    end = new Date(query.endDate);
    if (
      !query.startDate ||
      !query.endDate ||
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    )
      return { error: "Enter a valid report date range" };
  } else if (days[range]) {
    start = new Date(now.getTime() - days[range] * 24 * 60 * 60 * 1000);
  }
  const dateMatch = start ? { createdAt: { $gte: start, $lte: end } } : {};
  const daily =
    range === "7D" ||
    range === "30D" ||
    (range === "custom" && end - start <= 45 * 24 * 60 * 60 * 1000);
  return {
    range,
    start,
    end,
    dateMatch,
    bucketFormat: daily ? "%Y-%m-%d" : "%Y-%m",
  };
};

/**
 * @description Validates and normalizes discount input for its fixed scope and selected targets.
 * @param {object} body - Discount request body.
 * @param {string} scope - Game or category scope.
 * @returns {Promise<object>} Normalized data, or a validation error.
 */
const prepareDiscountInput = async (body, scope) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (!name || name.length > 100)
    return { error: "Discount name must be 1 to 100 characters" };
  if (!["game", "category"].includes(scope))
    return { error: "Invalid discount scope" };
  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate <= startDate
  )
    return { error: "End date must be after a valid start date" };
  if (endDate <= new Date()) return { error: "End date must be in the future" };

  const selectedGames = scope === "game" ? body.selectedGames : [];
  const selectedCategories =
    scope === "category" ? body.selectedCategories : [];
  if (scope === "game") {
    if (
      !Array.isArray(selectedGames) ||
      !selectedGames.length ||
      selectedGames.some((id) => !mongoose.isValidObjectId(id))
    )
      return { error: "Select at least one valid game" };
    const uniqueGames = [...new Set(selectedGames.map(String))];
    if (
      (await Product.countDocuments({ _id: { $in: uniqueGames } })) !==
      uniqueGames.length
    )
      return { error: "One or more selected games no longer exist" };
  }
  if (scope === "category") {
    if (
      !Array.isArray(selectedCategories) ||
      !selectedCategories.length ||
      selectedCategories.some(
        (item) => typeof item !== "string" || !item.trim()
      )
    )
      return { error: "Select at least one category" };
    const categories = await Product.distinct("category");
    if (selectedCategories.some((item) => !categories.includes(item)))
      return { error: "One or more selected categories no longer exist" };
  }
  return {
    data: {
      name,
      scope,
      selectedGames:
        scope === "game" ? [...new Set(selectedGames.map(String))] : [],
      selectedCategories:
        scope === "category" ? [...new Set(selectedCategories)] : [],
      startDate,
      endDate,
    },
  };
};

/**
 * @description Adds a computed status and scope details to a discount response.
 * @param {object} discount - Populated discount document or plain object.
 * @returns {object} Discount details prepared for the admin frontend.
 */
const serializeDiscount = (discount) => {
  const now = Date.now();
  const status = discount.isPaused
    ? "disabled"
    : new Date(discount.startDate).getTime() > now
    ? "scheduled"
    : new Date(discount.endDate).getTime() < now
    ? "expired"
    : "active";
  const selectedGames = (discount.selectedGames || []).filter(Boolean);
  const selectedCategories = discount.selectedCategories || [];
  const scopeDetails =
    discount.scope === "game"
      ? `${selectedGames.length} game(s) selected`
      : selectedCategories.join(", ");
  const discountData = discount.toObject
    ? discount.toObject()
    : { ...discount };
  delete discountData.type;
  delete discountData.value;
  return {
    ...discountData,
    id: String(discount._id),
    status,
    scopeDetails,
    gamesAffected: discount.scope === "game" ? selectedGames.length : null,
    gamesPreview:
      discount.scope === "game"
        ? selectedGames.map((game) => game.name || String(game))
        : [],
    createdBy: discount.createdBy?.name || discount.createdBy?.email || "Admin",
  };
};

/**
 * @description Validates banner content, placement, priority, devices, and schedule.
 * @param {object} data - Banner input.
 * @returns {string|null} A validation message, or null when the input is valid.
 */
const validateBanner = (data) => {
  if (
    typeof data.title !== "string" ||
    !data.title.trim() ||
    data.title.trim().length > 100
  )
    return "Title is required and must be 100 characters or fewer";
  if (typeof data.image !== "string" || !data.image.trim())
    return "Banner image is required";
  try {
    const imageUrl = new URL(data.image);
    if (!["http:", "https:"].includes(imageUrl.protocol))
      return "Banner image must be a valid HTTP or HTTPS URL";
  } catch {
    return "Banner image must be a valid HTTP or HTTPS URL";
  }
  if (!bannerPositions.includes(data.position))
    return "Invalid banner position";
  if (data.status !== undefined && !bannerStatuses.includes(data.status))
    return "Invalid banner status";
  if (
    data.linkTarget !== undefined &&
    !["_self", "_blank"].includes(data.linkTarget)
  )
    return "Invalid link target";
  if (
    data.deviceTypes !== undefined &&
    (!Array.isArray(data.deviceTypes) ||
      data.deviceTypes.length === 0 ||
      data.deviceTypes.some(
        (device) => !["desktop", "mobile"].includes(device)
      ))
  )
    return "Select at least one valid device type";
  const priority = Number(data.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 10)
    return "Priority must be between 1 and 10";
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (
    !data.startDate ||
    Number.isNaN(startDate.getTime()) ||
    !data.endDate ||
    Number.isNaN(endDate.getTime())
  )
    return "Valid start and end dates are required";
  if (endDate <= startDate) return "End date must be after start date";
  return null;
};

/**
 * @description Determines a banner's status from its disabled flag and schedule.
 * @param {string} status - Requested or existing banner status.
 * @param {Date|string} startDate - Banner start time.
 * @param {Date|string} endDate - Banner end time.
 * @returns {string} Disabled, scheduled, expired, or active status.
 */
const deriveBannerStatus = (status, startDate, endDate) => {
  if (status === "disabled") return status;
  const now = new Date();
  if (new Date(startDate) > now) return "scheduled";
  if (new Date(endDate) < now) return "expired";
  return "active";
};

/**
 * @description Sends a standard error response without a data payload.
 * @param {object} res - Express response.
 * @param {string} message - Error message.
 * @param {number} code - HTTP status code.
 * @returns {object} Response helper result.
 */
const sendErrorResponse = (res, message, code) =>
  Response.errorResponseWithoutData(res, message, code);

/**
 * @description Sends a standard bad-request response without a data payload.
 * @param {object} res - Express response.
 * @param {string} message - Validation or request error message.
 * @returns {object} Response helper result.
 */
const badRequest = (res, message) =>
  sendErrorResponse(res, message, Constant.STATUS_CODES.BAD_REQUEST);

/**
 * @description Sends an error response containing the server error message.
 * @param {object} res - Express response.
 * @param {Error} error - Server error.
 * @param {number} code - HTTP status code.
 * @returns {object} Response helper result.
 */
const sendServerErrorResponse = (res, error, code) =>
  Response.errorResponseData(
    res,
    error.message || "Internal Server Error",
    code
  );

/**
 * @description Compares a supplied password with an admin account's stored hash.
 * @param {string} adminId - Admin user ID.
 * @param {string} password - Password to verify.
 * @returns {Promise<boolean>} Whether the password matches the admin account.
 */
const verifyAdminPassword = async (adminId, password) => {
  if (!adminId || typeof password !== "string" || !password) return false;
  const admin = await User.findOne({
    _id: adminId,
    role: Constant.ROLE.ADMIN,
  }).select("password");
  return Boolean(admin && (await bcrypt.compare(password, admin.password)));
};

module.exports = {
  generateSlug,
  generateOrderId,
  escapeRegex,
  calculateDiscountPercentage,
  getReportWindow,
  prepareDiscountInput,
  serializeDiscount,
  validateBanner,
  deriveBannerStatus,
  sendErrorResponse,
  badRequest,
  sendServerErrorResponse,
  verifyAdminPassword,
  MAX_GIFT_CARD_QUANTITY,
  validateGiftCard,
  normalizeGiftCardPrefix,
  generateGiftCardCodes,
  serializeGiftCard,
};
