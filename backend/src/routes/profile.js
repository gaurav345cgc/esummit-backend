const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const auth = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { profileUpdateSchema } = require('../utils/validators');

const router = express.Router();

router.get('/profile', auth, getProfile);
router.put('/profile', auth, validateBody(profileUpdateSchema), updateProfile);

module.exports = router;

