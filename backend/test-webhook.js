// Quick Razorpay Webhook Test Script
// Usage: node test-webhook.js <order_id>
// Example: node test-webhook.js order_ABC123

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook/razorpay';
const ORDER_ID = process.argv[2];

if (!ORDER_ID) {
  console.error('❌ Usage: node test-webhook.js <order_id>');
  console.error('   Example: node test-webhook.js order_ABC123');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('❌ RAZORPAY_WEBHOOK_SECRET not set in .env');
  process.exit(1);
}

const payload = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_TEST123',
        order_id: ORDER_ID,
        amount: 500000,
        currency: 'INR',
        status: 'captured',
        created_at: Math.floor(Date.now() / 1000),
      },
    },
  },
};

const body = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

console.log('📤 Sending webhook test...');
console.log('   Order ID:', ORDER_ID);
console.log('   URL:', WEBHOOK_URL);
console.log('   Signature:', signature.substring(0, 20) + '...');

axios
  .post(WEBHOOK_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
  })
  .then((res) => {
    console.log('✅ Success!');
    console.log('   Response:', JSON.stringify(res.data, null, 2));
  })
  .catch((err) => {
    console.error('❌ Error:', err.response?.data || err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  });
