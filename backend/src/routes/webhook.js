const express = require('express');
const { razorpayWebhook } = require('../controllers/webhookController');

const router = express.Router();

// Razorpay webhook endpoint
// Note: This endpoint uses express.raw to get raw body for signature verification
router.post('/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

// Test endpoint to verify webhook setup (no auth needed, but can be protected)
router.get('/test', (req, res) => {
  const hasSecret = !!process.env.RAZORPAY_WEBHOOK_SECRET;
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  res.json({
    status: 'ok',
    webhook_configured: hasSecret,
    supabase_configured: hasServiceRole,
    message: hasSecret && hasServiceRole 
      ? 'Webhook is ready to receive requests' 
      : 'Missing configuration. Check RAZORPAY_WEBHOOK_SECRET and SUPABASE_SERVICE_ROLE_KEY',
  });
});

module.exports = router;
