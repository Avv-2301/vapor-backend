const Joi = require("joi");
const Response = require("@avv-2301/gamers-vault-common");
const Constant = require("@avv-2301/gamers-vault-common");

module.exports = {
  /**
   * @description This function is used to validate the user Signup function
   * @param req
   * @param res
   */

  userSignUpValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().trim().required(),
      email: Joi.string().email().trim().required(),
      password: Joi.string().trim().min(8).required(),
      confirmPassword: Joi.string().trim().min(8).required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        "All fields are required",
        Constant.STATUS_CODES.NOT_ACCEPTABLE
      );
    }
    return callback(true);
  },

  /**
   * @description This function is to validate the fields for login function
   * @param req
   * @param res
   */
  loginValidation: (req, res, callback) => {
    const schema = Joi.object({
      email: Joi.string().email().trim().required(),
      password: Joi.string().trim().min(8).required(),
      rememberMe: Joi.boolean().optional(),
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
      user_id: Joi.string().trim().required(),
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
   * @description This function is used to check get user validation
   * @param {*} req
   * @param {*} res
   * @param {*} callback
   * @returns true
   */
  getuserValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.string().trim().hex().length(24).required()
    });

    const { error } = schema.validate(req.body);
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
   * @description This function is used to check password field
   * @param {*} req
   * @param {*} res
   * @param {*} callback
   * @return true
   */
  passwordFieldValidation: (req, res, callback) => {
    const schema = Joi.object({
      password: Joi.string().trim().min(8).required(),
    });

    const { error } = schema.validate(req.body);

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
   * @description This function is used to validate the fields for logout user
   * @param req
   * @param res
   * @param callback
   * @return true
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
};
