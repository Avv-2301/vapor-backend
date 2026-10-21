const mongoose = require("mongoose");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const GiftCard = require("../../models/giftCard");
const {
  sendErrorResponse,
  sendServerErrorResponse,
  validateGiftCard,
  normalizeGiftCardPrefix,
  generateGiftCardCodes,
  serializeGiftCard,
  verifyAdminPassword,
} = require("../../services/helper");

module.exports = {
  /**
   * @description Validates and creates a batch of gift card codes.
   * @param req
   * @param res
   */
  createGiftCard: async (req, res) => {
    try {
      const validationError = validateGiftCard(req.body);
      if (validationError)
        return sendErrorResponse(
          res,
          validationError,
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const codePrefix = normalizeGiftCardPrefix(req.body.codePrefix);
      const giftCard = await GiftCard.create({
        amount: Number(req.body.amount),
        quantity: Number(req.body.quantity),
        codePrefix,
        notes: req.body.notes || "",
        image: req.body.image || null,
        expiresAt: req.body.expiresAt || null,
        codes: generateGiftCardCodes(Number(req.body.quantity), codePrefix),
        createdBy: req.authUserId,
      });
      return Response.successResponseData(
        res,
        serializeGiftCard(giftCard.toObject()),
        Constant.STATUS_CODES.CREATED,
        "Gift cards created successfully"
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
   * @description Retrieves all gift card batches, newest first.
   * @param _req
   * @param res
   */
  getAllGiftCards: async (_req, res) => {
    try {
      const giftCards = await GiftCard.find().sort({ createdAt: -1 }).lean();
      return Response.successResponseData(
        res,
        { giftCards: giftCards.map(serializeGiftCard) },
        Constant.STATUS_CODES.SUCCESS,
        "Gift cards retrieved successfully"
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
   * @description Retrieves a gift card batch by ID with its code inventory.
   * @param req
   * @param res
   */
  getGiftCardById: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid gift card ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const giftCard = await GiftCard.findById(req.params.id).lean();
      if (!giftCard)
        return sendErrorResponse(
          res,
          "Gift card not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      return Response.successResponseData(
        res,
        serializeGiftCard(giftCard),
        Constant.STATUS_CODES.SUCCESS,
        "Gift card retrieved successfully"
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
   * @description Updates a gift card batch while preserving redeemed codes.
   * @param req
   * @param res
   */
  updateGiftCard: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid gift card ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const giftCard = await GiftCard.findById(req.params.id);
      if (!giftCard)
        return sendErrorResponse(
          res,
          "Gift card not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );

      const nextQuantity =
        req.body.quantity === undefined
          ? giftCard.codes.length
          : Number(req.body.quantity);
      const candidate = {
        amount: req.body.amount ?? giftCard.amount,
        quantity: nextQuantity,
        expiresAt:
          req.body.expiresAt === undefined
            ? giftCard.expiresAt
            : req.body.expiresAt,
        codePrefix: req.body.codePrefix ?? giftCard.codePrefix,
        notes: req.body.notes ?? giftCard.notes,
        image: req.body.image === undefined ? giftCard.image : req.body.image,
      };
      const validationError = validateGiftCard(candidate);
      if (validationError)
        return sendErrorResponse(
          res,
          validationError,
          Constant.STATUS_CODES.BAD_REQUEST
        );

      const redeemedCodes = giftCard.codes.filter(
        (code) => code.redeemedAt || code.redeemedBy
      );
      if (nextQuantity < redeemedCodes.length)
        return sendErrorResponse(
          res,
          "Quantity cannot be lower than the number of redeemed cards",
          Constant.STATUS_CODES.BAD_REQUEST
        );

      const codePrefix = normalizeGiftCardPrefix(candidate.codePrefix);
      const nextCodes = [...redeemedCodes];
      const availableCodes = giftCard.codes.filter(
        (code) => !code.redeemedAt && !code.redeemedBy
      );
      nextCodes.push(
        ...availableCodes.slice(0, nextQuantity - redeemedCodes.length)
      );
      if (nextCodes.length < nextQuantity)
        nextCodes.push(
          ...generateGiftCardCodes(nextQuantity - nextCodes.length, codePrefix)
        );

      giftCard.amount = Number(candidate.amount);
      giftCard.expiresAt = candidate.expiresAt || null;
      giftCard.codePrefix = codePrefix;
      giftCard.notes = candidate.notes;
      giftCard.image = candidate.image || null;
      giftCard.codes = nextCodes;
      await giftCard.save();
      return Response.successResponseData(
        res,
        serializeGiftCard(giftCard.toObject()),
        Constant.STATUS_CODES.SUCCESS,
        "Gift cards updated successfully"
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
   * @description Verifies the admin password and permanently deletes a gift card batch.
   * @param req
   * @param res
   */
  deleteGiftCard: async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id))
        return sendErrorResponse(
          res,
          "Invalid gift card ID",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      if (typeof req.body?.password !== "string" || !req.body.password.trim())
        return sendErrorResponse(
          res,
          "Admin password is required to delete gift cards",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      if (!(await verifyAdminPassword(req.authUserId, req.body.password)))
        return sendErrorResponse(
          res,
          "Invalid admin password",
          Constant.STATUS_CODES.BAD_REQUEST
        );
      const giftCard = await GiftCard.findByIdAndDelete(req.params.id);
      if (!giftCard)
        return sendErrorResponse(
          res,
          "Gift card not found",
          Constant.STATUS_CODES.PAGE_NOT_FOUND
        );
      return Response.successResponseData(
        res,
        { id: String(giftCard._id) },
        Constant.STATUS_CODES.SUCCESS,
        "Gift cards deleted successfully"
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
