const Joi = require("joi");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");

module.exports = {
  /**
   * @description This function is used to validate product ID
   * @param req
   * @param res
   * @param callback
   */
  getProductByIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "Product ID format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is used to validate review creation
   * @param req
   * @param res
   * @param callback
   */
  createReviewValidation: (req, res, callback) => {
    const schema = Joi.object({
      productId: Joi.string().trim().hex().length(24).required(),
      rating: Joi.number().integer().min(1).max(5).required(),
      title: Joi.string().trim().max(100).optional(),
      comment: Joi.string().trim().max(2000).required(),
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
   * @description This function is used to validate review ID
   * @param req
   * @param res
   * @param callback
   */
  getReviewByIdValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: Joi.string().trim().hex().length(24).required(),
    });
    const { error } = schema.validate({ id: req.params.id || req.query.id });
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "Review ID format not matched",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },
};
