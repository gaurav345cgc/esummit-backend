const express = require('express');
const healthRouter = require('./health');
const authRouter = require('./auth');
const profileRouter = require('./profile');
const eventsRouter = require('./events');
const passesRouter = require('./passes');
const ordersRouter = require('./orders');
const dashboardRouter = require('./dashboard');
const webhookRouter = require('./webhook');
const cronRouter = require('./cron');

const router = express.Router();

// Public health endpoint
router.use('/', healthRouter);

// Auth
router.use('/', authRouter);

// Authenticated user/profile
router.use('/', profileRouter);
router.use('/', ordersRouter);
router.use('/', dashboardRouter);

// Public data
router.use('/', eventsRouter);
router.use('/', passesRouter);

// Webhooks (no auth, but signature verified)
router.use('/webhook', webhookRouter);

// Cron endpoints (no auth)
router.use('/cron', cronRouter);

module.exports = router;

