const Razorpay = require('razorpay');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (!keyId || !keySecret) {
  // eslint-disable-next-line no-console
  console.warn('Razorpay test keys missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
} else {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

module.exports = {
  razorpay,
};

