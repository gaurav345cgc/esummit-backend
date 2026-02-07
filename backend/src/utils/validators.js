const Joi = require('joi');

// Auth
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().optional(),
  org: Joi.string().optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Profile
const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().optional(),
  org: Joi.string().optional(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
}).min(1);

// Buy
const buyPassSchema = Joi.object({
  expected_amount: Joi.number().integer().min(1).required(),
  version: Joi.number().integer().min(0).optional(),
});

const upgradePassSchema = Joi.object({
  expected_amount: Joi.number().integer().min(1).required(),
  version: Joi.number().integer().min(0).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  buyPassSchema,
  upgradePassSchema,
};

