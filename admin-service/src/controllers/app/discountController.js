const mongoose = require("mongoose");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const Discount = require("../../models/discount");
const Product = require("../../models/Product");
const {
  refreshDiscountActivation,
} = require("../../services/discountActivation");
const {
  sendErrorResponse,
  sendServerErrorResponse,
  verifyAdminPassword,
  badRequest,
  serializeDiscount,
  prepareDiscountInput,
} = require("../../services/helper");

module.exports = {
  /**
   * @description Validates and creates a targeted discount.
   * @param req
   * @param res
   */
  createDiscount: async (req, res) => {
    try {
      const { data, error } = await prepareDiscountInput(
        req.body || {},
        req.body?.scope
      );
      if (error) return badRequest(res, error);
      const discount = await Discount.create({
        ...data,
        createdBy: req.authUserId,
      });
      await refreshDiscountActivation();
      return Response.successResponseData(
        res,
        serializeDiscount(discount),
        Constant.STATUS_CODES.CREATED,
        "Discount created successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Retrieves a discount by ID with its creator and selected games.
   * @param req
   * @param res
   */
  getDiscountById: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return badRequest(res, "Invalid discount ID");
      const discount = await Discount.findOne({
        _id: req.params.id,
        scope: { $in: ["game", "category"] },
      })
        .populate("createdBy", "name email")
        .populate("selectedGames", "name")
        .lean();
      if (!discount)
        return sendErrorResponse(
          res,
          "Discount not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      return Response.successResponseData(
        res,
        serializeDiscount(discount),
        Constant.STATUS_CODES.SUCCESS,
        "Discount retrieved successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Updates a discount without changing its scope.
   * @param req
   * @param res
   */
  updateDiscount: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return badRequest(res, "Invalid discount ID");
      const discount = await Discount.findOne({
        _id: req.params.id,
        scope: { $in: ["game", "category"] },
      });
      if (!discount)
        return sendErrorResponse(
          res,
          "Discount not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      if (req.body?.scope !== undefined && req.body.scope !== discount.scope)
        return badRequest(res, "Discount scope cannot be changed");

      const { data, error } = await prepareDiscountInput(
        req.body || {},
        discount.scope
      );
      if (error) return badRequest(res, error);
      Object.assign(discount, data);
      await discount.save();
      await refreshDiscountActivation();

      return Response.successResponseData(
        res,
        serializeDiscount(discount),
        Constant.STATUS_CODES.SUCCESS,
        "Discount updated successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Retrieves all discounts.
   * @param _req
   * @param res
   */
  getAllDiscounts: async (_req, res) => {
    try {
      const discounts = await Discount.find({
        scope: { $in: ["game", "category"] },
      })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email")
        .populate("selectedGames", "name")
        .lean();
      return Response.successResponseData(
        res,
        { discounts: discounts.map(serializeDiscount) },
        Constant.STATUS_CODES.SUCCESS,
        "Discounts retrieved successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Retrieves game and category choices for the discount form.
   * @param _req
   * @param res
   */
  getDiscountOptions: async (_req, res) => {
    try {
      const [games, categories] = await Promise.all([
        Product.find().select("name").sort({ name: 1 }).lean(),
        Product.distinct("category"),
      ]);
      return Response.successResponseData(
        res,
        {
          games: games.map((game) => ({
            id: String(game._id),
            name: game.name,
          })),
          categories: categories
            .filter(Boolean)
            .sort()
            .map((name) => ({ id: name, name })),
        },
        Constant.STATUS_CODES.SUCCESS,
        "Discount options retrieved successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Verifies the admin password and pauses or resumes a discount.
   * @param req
   * @param res
   */
  setDiscountPaused: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return badRequest(res, "Invalid discount ID");
      if (typeof req.body?.paused !== "boolean")
        return badRequest(res, "Paused must be true or false");
      if (typeof req.body?.password !== "string" || !req.body.password.trim())
        return badRequest(res, "Admin password is required");
      if (!(await verifyAdminPassword(req.authUserId, req.body.password)))
        return badRequest(res, "Invalid admin password");

      const discount = await Discount.findOneAndUpdate(
        { _id: req.params.id, scope: { $in: ["game", "category"] } },
        { isPaused: req.body.paused },
        { new: true }
      );
      if (!discount)
        return sendErrorResponse(
          res,
          "Discount not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      await refreshDiscountActivation();
      return Response.successResponseData(
        res,
        discount,
        Constant.STATUS_CODES.SUCCESS,
        req.body.paused
          ? "Discount paused successfully"
          : "Discount resumed successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Verifies the admin password and deletes a discount.
   * @param req
   * @param res
   */
  deleteDiscount: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return badRequest(res, "Invalid discount ID");
      if (typeof req.body?.password !== "string" || !req.body.password.trim())
        return badRequest(res, "Admin password is required");
      if (!(await verifyAdminPassword(req.authUserId, req.body.password)))
        return badRequest(res, "Invalid admin password");

      const discount = await Discount.findOneAndDelete({
        _id: req.params.id,
        scope: { $in: ["game", "category"] },
      });
      if (!discount)
        return sendErrorResponse(
          res,
          "Discount not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      await refreshDiscountActivation();
      return Response.successResponseData(
        res,
        discount,
        Constant.STATUS_CODES.SUCCESS,
        "Discount deleted successfully"
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },

  /**
   * @description Verifies the admin password and pauses, resumes, or deletes selected discounts.
   * @param req
   * @param res
   */
  bulkDiscountAction: async (req, res) => {
    try {
      const { ids, action, password } = req.body || {};
      if (
        !Array.isArray(ids) ||
        ids.length === 0 ||
        ids.length > 100 ||
        ids.some((id) => !mongoose.isValidObjectId(id))
      )
        return badRequest(res, "Select 1 to 100 valid discounts");
      if (!["pause", "resume", "delete"].includes(action))
        return badRequest(res, "Invalid discount action");
      if (typeof password !== "string" || !password.trim())
        return badRequest(res, "Admin password is required");
      if (!(await verifyAdminPassword(req.authUserId, password)))
        return badRequest(res, "Invalid admin password");

      const uniqueIds = [...new Set(ids.map(String))];
      const query = {
        _id: { $in: uniqueIds },
        scope: { $in: ["game", "category"] },
      };
      const existingDiscounts = await Discount.find(query).select("_id").lean();
      if (existingDiscounts.length !== uniqueIds.length)
        return sendErrorResponse(
          res,
          "One or more discounts no longer exist",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      if (action === "delete") await Discount.deleteMany(query);
      else
        await Discount.updateMany(query, {
          $set: { isPaused: action === "pause" },
        });
      await refreshDiscountActivation();
      return Response.successResponseData(
        res,
        { affectedCount: uniqueIds.length },
        Constant.STATUS_CODES.SUCCESS,
        `${uniqueIds.length} discount(s) ${
          action === "delete"
            ? "deleted"
            : action === "pause"
            ? "paused"
            : "resumed"
        } successfully`
      );
    } catch (error) {
      return sendServerErrorResponse(
        res,
        error,
        Constant.STATUS_CODES.INTERNAL_SERVER
      );
    }
  },
};
