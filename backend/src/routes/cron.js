const express = require('express');
const { ping } = require('../controllers/cronController');

const router = express.Router();

// Cron ping endpoint (no auth required, but can be protected with a secret header)
router.post('/ping', ping);

module.exports = router;
