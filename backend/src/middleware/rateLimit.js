const rateLimit = require('express-rate-limit');

// Global rate limiter: 100 requests per minute per IP
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiRateLimiter,
};

