const Joi = require("joi");

const credentialsSchema = {
  email: Joi.string().email().trim().lowercase().required(),
  password: Joi.string().min(8).max(16).required(),
};

const registrationSchema = Joi.object({
  ...credentialsSchema,
  name: Joi.string().trim().max(100).required(),
  confirmPassword: Joi.valid(Joi.ref("password")).required(),
});

const loginSchema = Joi.object({
  ...credentialsSchema,
  rememberMe: Joi.boolean().default(false),
});

const passwordStrengthSchema = Joi.object({
  password: Joi.string().min(1).max(16).required(),
});

module.exports = {
  validateRegistration: (payload) => registrationSchema.validate(payload),
  validateLogin: (payload) => loginSchema.validate(payload),
  validatePasswordStrength: (payload) =>
    passwordStrengthSchema.validate(payload),
};
