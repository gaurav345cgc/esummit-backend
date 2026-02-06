const express = require('express');
const { listEvents, getEvent } = require('../controllers/eventsController');

const router = express.Router();

router.get('/events', listEvents);
router.get('/events/:id', getEvent);

module.exports = router;

