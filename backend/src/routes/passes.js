const express = require('express');
const { listPasses, buyPass, upgradePass } = require('../controllers/passesController');
const auth = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { buyPassSchema, upgradePassSchema } = require('../utils/validators');

const router = express.Router();

router.get('/passes', listPasses);
router.post('/passes/:id/buy', auth, validateBody(buyPassSchema), buyPass);
router.post('/passes/:id/upgrade', auth, validateBody(upgradePassSchema), upgradePass);

module.exports = router;

