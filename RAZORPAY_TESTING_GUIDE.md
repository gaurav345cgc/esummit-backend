# Razorpay Webhook Testing Guide

## How to Test Razorpay Integration End-to-End

### Prerequisites
- [ ] Backend deployed (Vercel or local)
- [ ] Razorpay test account set up
- [ ] `RAZORPAY_WEBHOOK_SECRET` configured
- [ ] Database migrations run (`confirm_payment` RPC exists)

---

## Test 1: Manual Webhook Test (Recommended)

### Step 1: Create a Test Order

```bash
# 1. Register/Login to get token
POST http://localhost:3000/api/register
{
  "email": "test@example.com",
  "password": "test123",
  "name": "Test User",
  "phone": "9876543210",
  "org": "CGC",
  "year": 2026
}

# Save the access_token from response

# 2. Buy a pass
POST http://localhost:3000/api/passes/1/buy
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "expected_amount": 5000,
  "version": 0
}

# Save the razorpay_order.id from response (e.g., "order_ABC123")
```

### Step 2: Simulate Razorpay Webhook

**Option A: Using Razorpay Dashboard (Easiest)**

1. Go to **Razorpay Dashboard** → **Settings** → **Webhooks**
2. Click **"Test"** or **"Send Test Webhook"**
3. Select event: **`payment.captured`**
4. Use this payload (replace `order_ABC123` with your actual order ID):

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_TEST123",
        "order_id": "order_ABC123",
        "amount": 500000,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

5. Razorpay will send webhook to your configured URL
6. Check your backend logs for confirmation

**Option B: Manual cURL Test**

```bash
# Generate signature (requires webhook secret)
# Use this Node.js script or online HMAC tool:

node -e "
const crypto = require('crypto');
const body = JSON.stringify({
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_TEST123',
        order_id: 'order_ABC123',
        amount: 500000,
        currency: 'INR',
        status: 'captured'
      }
    }
  }
});
const secret = 'YOUR_WEBHOOK_SECRET';
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
console.log('Signature:', signature);
console.log('Body:', body);
"

# Then send webhook:
curl -X POST http://localhost:3000/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: GENERATED_SIGNATURE" \
  -d 'PAYLOAD_BODY'
```

### Step 3: Verify Results

**Check Database:**
```sql
-- In Supabase SQL Editor
SELECT * FROM orders WHERE razorpay_payment_id = 'order_ABC123';
-- Status should be 'success'

SELECT * FROM passes WHERE id = 1;
-- Stock should be decremented by 1
```

**Check Backend Logs:**
- Should see: "Payment confirmed" or "Order updated"
- No errors in console

**Expected Response:**
```json
{
  "ok": true,
  "message": "Payment confirmed",
  "order_id": "uuid-here"
}
```

---

## Test 2: Full Payment Flow Test

### Step 1: Create Order via API
```bash
POST /api/passes/1/buy
# Get razorpay_order.id
```

### Step 2: Complete Payment in Razorpay Test Mode

1. Use Razorpay test card: **4111 1111 1111 1111**
2. CVV: **123**
3. Expiry: **Any future date**
4. Complete payment

### Step 3: Webhook Auto-Fires

Razorpay automatically sends webhook to your configured URL. Check:
- Backend receives webhook
- Order status updated to `success`
- Pass stock decremented

---

## Test 3: Verify Webhook Signature

### Test Invalid Signature (Should Fail)

```bash
curl -X POST http://localhost:3000/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: invalid_signature" \
  -d '{"event":"payment.captured","payload":{}}'

# Expected: 401 Unauthorized
```

### Test Missing Signature (Should Fail)

```bash
curl -X POST http://localhost:3000/api/webhook/razorpay \
  -H "Content-Type: application/json" \
  -d '{"event":"payment.captured","payload":{}}'

# Expected: 401 Unauthorized
```

---

## Test 4: Check RPC Function Works

### Verify RPC Exists

```sql
-- In Supabase SQL Editor
SELECT proname FROM pg_proc WHERE proname = 'confirm_payment';
-- Should return: confirm_payment
```

### Test RPC Directly

```sql
-- Create a test order first
INSERT INTO orders (user_id, pass_id, razorpay_payment_id, status)
VALUES ('user-uuid', 1, 'order_TEST', 'pending');

-- Call RPC
SELECT confirm_payment(
  'order-uuid'::UUID,
  'pay_TEST123',
  1
);

-- Check results
SELECT * FROM orders WHERE razorpay_payment_id = 'order_TEST';
SELECT * FROM passes WHERE id = 1;
```

---

## Common Issues & Fixes

### Issue 1: "Invalid signature"
**Fix:**
- Check `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
- Verify signature is calculated on raw body (not parsed JSON)
- Ensure webhook secret is set in `.env`

### Issue 2: "Order not found"
**Fix:**
- Verify `razorpay_payment_id` in orders table matches `order_id` from webhook
- Check order was created before webhook arrives
- Ensure order exists: `SELECT * FROM orders WHERE razorpay_payment_id = 'order_XXX';`

### Issue 3: "RPC function not found"
**Fix:**
- Run migration: `supabase/migrations/001_confirm_payment_rpc.sql`
- Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'confirm_payment';`
- Fallback: Direct updates will work if RPC missing

### Issue 4: "Stock not decrementing"
**Fix:**
- Check RPC function is working
- Verify pass exists: `SELECT * FROM passes WHERE id = X;`
- Check logs for errors during stock update

### Issue 5: "Webhook not receiving"
**Fix:**
- Verify webhook URL is correct in Razorpay dashboard
- Check if backend is accessible (health check)
- Ensure webhook is enabled in Razorpay
- Check Vercel logs if deployed

---

## Quick Test Script

Save as `test-webhook.js`:

```javascript
const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_secret';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhook/razorpay';
const ORDER_ID = process.argv[2] || 'order_TEST123';

const payload = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        id: 'pay_TEST123',
        order_id: ORDER_ID,
        amount: 500000,
        currency: 'INR',
        status: 'captured'
      }
    }
  }
};

const body = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');

axios.post(WEBHOOK_URL, payload, {
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature
  }
})
.then(res => {
  console.log('✅ Success:', res.data);
})
.catch(err => {
  console.error('❌ Error:', err.response?.data || err.message);
});
```

**Run:**
```bash
node test-webhook.js order_ABC123
```

---

## Production Checklist

- [ ] Webhook URL configured in Razorpay dashboard
- [ ] `RAZORPAY_WEBHOOK_SECRET` set in production env vars
- [ ] RPC functions deployed to production DB
- [ ] Test webhook receives successfully
- [ ] Order status updates correctly
- [ ] Stock decrements correctly
- [ ] No errors in production logs

---

## Monitoring

### Check Webhook Logs

**Local:**
- Check console output when webhook received

**Vercel:**
- Dashboard → Your Project → Deployments → Logs
- Filter for `/api/webhook/razorpay`

**Supabase:**
- Dashboard → Logs → Edge Functions (if using Edge Function)

---

## Next Steps After Testing

1. ✅ Webhook receives and processes correctly
2. ✅ Order status updates
3. ✅ Stock decrements
4. ✅ No errors in logs
5. 🚀 Ready for production!
