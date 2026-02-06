const express = require('express');
const { listOrders } = require('../controllers/ordersController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/orders', auth, listOrders);

module.exports = router;

