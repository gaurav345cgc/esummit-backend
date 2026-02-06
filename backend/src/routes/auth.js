const express = require('express');
const { register, login } = require('../controllers/authController');
const { validateBody } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../utils/validators');

const router = express.Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);

module.exports = router;

