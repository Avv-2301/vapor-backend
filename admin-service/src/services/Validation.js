const Joi = require("joi");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");
const gameImageSchema = Joi.string().uri({ scheme: ["http", "https"] });
const systemRequirementSchema = Joi.object({
  os: Joi.string().allow('').optional(),
  processor: Joi.string().allow('').optional(),
  memory: Joi.string().allow('').optional(),
  graphics: Joi.string().allow('').optional(),
  storage: Joi.string().allow('').optional(),
  directX: Joi.string().allow('').optional(),
});
const detailPageFields = {
  matureContentDescription: Joi.string().allow('').optional(),
  metascore: Joi.number().min(0).max(100).allow(null).optional(),
  achievementCount: Joi.number().integer().min(0).optional(),
  featureHighlights: Joi.array().items(Joi.object({
    title: Joi.string().allow('').optional(),
    description: Joi.string().allow('').optional(),
  })).optional(),
  supportedFeatures: Joi.array().items(Joi.string()).optional(),
  languageSupport: Joi.array().items(Joi.object({
    language: Joi.string().allow('').required(),
    interface: Joi.boolean().optional(),
    audio: Joi.boolean().optional(),
    subtitles: Joi.boolean().optional(),
  })).optional(),
};

module.exports = {
  /**
   * @description This function is to validate the fields for login function
   * @param req
   * @param res
   */
  loginValidation: (req, res, callback) => {
    const schema = Joi.object({
      email: Joi.string().email().trim().required(),
      password: Joi.string().trim().min(8).required(),
    });

    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "all fields are required",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is to validate the fields for logout function
   * @param req
   * @param res
   */
  logoutValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.string().trim().required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "UserId is not in proper format",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate update password fields
   * @param req
   * @param res
   * @param callback
   * @return true
   */
  updatePasswordValidation: (req, res, callback) => {
    const schema = Joi.object({
      newPassword: Joi.string().trim().min(8).required(),
      confirmPassword: Joi.string().trim().min(8).required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "New password and confirm password are required (minimum 8 characters)",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate game creation
   * @param req
   * @param res
   * @param callback
   */
  createGameValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().trim().required(),
      slug: Joi.string().trim().lowercase().optional(),
      description: Joi.string().required(),
      shortDescription: Joi.string().max(200).optional(),
      ...detailPageFields,
      price: Joi.number().min(0).required(),
      category: Joi.string().trim().required(),
      thumbnail: Joi.string().uri({ scheme: ["http", "https"] }).required(),
      discountPrice: Joi.number().min(0).optional(),
      discountPercentage: Joi.number().min(0).max(100).optional(),
      isDiscountActive: Joi.boolean().optional(),
      releaseDate: Joi.date().required(),
      developer: Joi.string().trim().required(),
      publisher: Joi.string().trim().required(),
      genres: Joi.array().items(Joi.string()).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      images: Joi.array().items(gameImageSchema).max(10).optional(),
      videos: Joi.array().items(Joi.string().uri()).optional(),
      screenshots: Joi.array()
        .items(Joi.string().uri({ scheme: ["http", "https"] }))
        .optional(),
      systemRequirements: Joi.object({
        minimum: systemRequirementSchema.optional(),
        recommended: systemRequirementSchema.optional(),
      }).optional(),
      languages: Joi.array().items(Joi.string()).optional(),
      ageRating: Joi.string()
        .valid("E", "E10+", "T", "M", "AO", "RP")
        .optional(),
      platform: Joi.array()
        .items(Joi.string().valid("Windows", "Mac", "Linux"))
        .optional(),
      downloadSize: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
      stock: Joi.number().optional(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0].message || "Validation error",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate game ID
   * @param req
   * @param res
   * @param callback
   */
  getGameByIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "Game ID format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to change visiblity of a game
   * @param req
   * @param res
   * @param callback
   */
  gameVisibilityValidation: (req, res, callback) => {
    const schema = Joi.object({
      isActive: Joi.boolean().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0]?.message || "Game Visibility format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate game update fields
   * @param req
   * @param res
   * @param callback
   */
  updateGameValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().trim().optional(),
      slug: Joi.string().trim().lowercase().optional(),
      description: Joi.string().optional(),
      shortDescription: Joi.string().max(200).optional(),
      ...detailPageFields,
      category: Joi.string().trim().optional(),
      thumbnail: Joi.string().uri({ scheme: ["http", "https"] }).optional(),
      price: Joi.number().min(0).optional(),
      discountPrice: Joi.number().min(0).allow(null).optional(),
      discountPercentage: Joi.number().min(0).max(100).optional(),
      isDiscountActive: Joi.boolean().optional(),
      releaseDate: Joi.date().optional(),
      developer: Joi.string().trim().optional(),
      publisher: Joi.string().trim().optional(),
      genres: Joi.array().items(Joi.string()).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      images: Joi.array().items(gameImageSchema).max(10).optional(),
      videos: Joi.array().items(Joi.string().uri()).optional(),
      screenshots: Joi.array()
        .items(Joi.string().uri({ scheme: ["http", "https"] }))
        .optional(),
      systemRequirements: Joi.object({
        minimum: systemRequirementSchema.optional(),
        recommended: systemRequirementSchema.optional(),
      }).optional(),
      languages: Joi.array().items(Joi.string()).optional(),
      ageRating: Joi.string()
        .valid("E", "E10+", "T", "M", "AO", "RP")
        .optional(),
      platform: Joi.array()
        .items(Joi.string().valid("Windows", "Mac", "Linux"))
        .optional(),
      downloadSize: Joi.string().optional(),
      isActive: Joi.boolean().optional(),
      isFeatured: Joi.boolean().optional(),
      stock: Joi.number().optional(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0].message || "Validation error",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate user ID
   * @param req
   * @param res
   * @param callback
   */
  getUserByIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "User ID format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate wallet balance update
   * @param req
   * @param res
   * @param callback
   */
  addWalletBalanceValidation: (req, res, callback) => {
    const schema = Joi.object({
      amount: Joi.number().required(),
      confirmAmount: Joi.number().required(),
      reason: Joi.string().trim(),
      password: Joi.string().trim().min(8).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0].message,
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate wallet balance deduct
   * @param req
   * @param res
   * @param callback
   */
  deductWalletBalanceValidation: (req, res, callback) => {
    const schema = Joi.object({
      amount: Joi.number().required(),
      confirmAmount: Joi.number().required(),
      reason: Joi.string().trim(),
      password: Joi.string().trim().min(8).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0].message,
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate get user transaction
   * @param req
   * @param res
   * @param callback
   */
  userTransactionvalidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        error.details[0].message,
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },
};
