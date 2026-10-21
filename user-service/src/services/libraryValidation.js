const Joi = require("joi");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");

module.exports = {
  /**
   * @description This function is used to validate library creation
   * @param req
   * @param res
   * @param callback
   */
  createLibraryValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "UserId is required and must be a valid ObjectId",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate get library by ID
   * @param req
   * @param res
   * @param callback
   */
  getLibraryByIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "Library ID format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate get library by userId
   * @param req
   * @param res
   * @param callback
   */
  getLibraryByUserIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ userId: req.authUserId });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "UserId format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate add game to library
   * @param req
   * @param res
   * @param callback
   */
  addGameValidation: (req, res, callback) => {
    const schema = Joi.object({
      libraryId: Joi.string().trim().hex().length(24).required(),
      gameId: Joi.string().trim().hex().length(24).required(),
      gameName: Joi.string().trim().required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "All fields are required (libraryId, gameId, gameName)",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate remove game from library
   * @param req
   * @param res
   * @param callback
   */
  removeGameValidation: (req, res, callback) => {
    const schema = Joi.object({
      libraryId: Joi.string().trim().hex().length(24).required(),
      gameId: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "Library ID and Game ID are required",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },
};

