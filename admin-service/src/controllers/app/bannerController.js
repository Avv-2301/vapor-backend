const mongoose = require("mongoose");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const Banner = require("../../models/banner");
const {
  validateBanner,
  deriveBannerStatus,
  sendErrorResponse,
  sendServerErrorResponse,
  verifyAdminPassword,
} = require("../../services/helper");

module.exports = {
  /**
   * @description Validates and creates a banner with a status derived from its schedule.
   * @param req
   * @param res
   */
  createBanner: async (req, res) => {
    try {
      const validationError = validateBanner(req.body);
      if (validationError)
        return sendErrorResponse(
          res,
          validationError,
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const payload = {
        ...req.body,
        title: req.body.title.trim(),
        createdBy: req.authUserId,
      };
      payload.status = deriveBannerStatus(
        payload.status || "active",
        payload.startDate,
        payload.endDate
      );
      const banner = await Banner.create(payload);
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.CREATED,
        "Banner created successfully"
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
   * @description Retrieves all banners, newest first, with their creators.
   * @param _req
   * @param res
   */
  getAllBanners: async (_req, res) => {
    try {
      const banners = await Banner.find()
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email")
        .lean();
      return Response.successResponseData(
        res,
        { banners },
        Constant.STATUS_CODES.SUCCESS,
        "Banners retrieved successfully"
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
   * @description Retrieves a banner by ID with its creator details.
   * @param req
   * @param res
   */
  getBannerById: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid banner ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const banner = await Banner.findById(req.params.id).populate(
        "createdBy",
        "name email"
      );
      if (!banner)
        return sendErrorResponse(
          res,
          "Banner not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.SUCCESS,
        "Banner retrieved successfully"
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
   * @description Validates and updates a banner, including its schedule-based status.
   * @param req
   * @param res
   */
  updateBanner: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid banner ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const banner = await Banner.findById(req.params.id);
      if (!banner)
        return sendErrorResponse(
          res,
          "Banner not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      const updates = { ...req.body };
      const candidate = { ...banner.toObject(), ...updates };
      const validationError = validateBanner(candidate);
      if (validationError)
        return sendErrorResponse(
          res,
          validationError,
          Constant.STATUS_CODES.BAD_REQUEST
        );
      delete updates._id;
      delete updates.createdBy;
      delete updates.clicks;
      delete updates.impressions;
      updates.title = updates.title?.trim() || candidate.title;
      updates.status = deriveBannerStatus(
        candidate.status,
        candidate.startDate,
        candidate.endDate
      );
      Object.assign(banner, updates);
      await banner.save();
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.SUCCESS,
        "Banner updated successfully"
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
   * @description Verifies the admin password and permanently deletes a banner.
   * @param req
   * @param res
   */
  deleteBanner: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid banner ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      if (typeof req.body?.password !== "string" || !req.body.password) {
        return sendErrorResponse(
          res,
          "Admin password is required to delete a banner",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }
      if (!(await verifyAdminPassword(req.authUserId, req.body.password))) {
        return sendErrorResponse(
          res,
          "Invalid admin password",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      }
      const banner = await Banner.findByIdAndDelete(req.params.id);
      if (!banner)
        return sendErrorResponse(
          res,
          "Banner not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.SUCCESS,
        "Banner deleted successfully"
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
   * @description Verifies the admin password and disables a banner.
   * @param req
   * @param res
   */
  pauseBanner: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid banner ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      if (typeof req.body?.password !== "string" || !req.body.password)
        return sendErrorResponse(
          res,
          "Admin password is required to pause a banner",
          Constant.STATUS_CODES.BAD_REQUEST
        );

      const banner = await Banner.findById(req.params.id);
      if (!banner)
        return sendErrorResponse(
          res,
          "Banner not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      if (!(await verifyAdminPassword(req.authUserId, req.body.password)))
        return sendErrorResponse(
          res,
          "Invalid admin password",
          Constant.STATUS_CODES.BAD_REQUEST
        );

      banner.status = "disabled";
      await banner.save();
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.SUCCESS,
        "Banner paused successfully"
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
   * @description Verifies the admin password and re-enables a banner according to its schedule.
   * @param req
   * @param res
   */
  resumeBanner: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid banner ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      if (typeof req.body?.password !== "string" || !req.body.password)
        return sendErrorResponse(
          res,
          "Admin password is required to resume a banner",
          Constant.STATUS_CODES.BAD_REQUEST
        );

      const banner = await Banner.findById(req.params.id);
      if (!banner)
        return sendErrorResponse(
          res,
          "Banner not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      if (!(await verifyAdminPassword(req.authUserId, req.body.password)))
        return sendErrorResponse(
          res,
          "Invalid admin password",
          Constant.STATUS_CODES.BAD_REQUEST
        );

      banner.status = deriveBannerStatus(
        "active",
        banner.startDate,
        banner.endDate
      );
      await banner.save();
      return Response.successResponseData(
        res,
        banner,
        Constant.STATUS_CODES.SUCCESS,
        "Banner status updated successfully"
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
