const express = require('express');
const { listPasses, buyPass } = require('../controllers/passesController');
const auth = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { buyPassSchema } = require('../utils/validators');

const router = express.Router();

router.get('/passes', listPasses);
router.post('/passes/:id/buy', auth, validateBody(buyPassSchema), buyPass);

module.exports = router;

