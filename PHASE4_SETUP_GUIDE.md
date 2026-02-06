# Phase 4 Setup Guide - Razorpay Webhook Configuration

## Step-by-Step: Get Razorpay Webhook Credentials

### Prerequisites
- [ ] Razorpay account (test or live)
- [ ] Backend running (local or deployed)
- [ ] Supabase project ready

---

## Step 1: Get Razorpay Webhook Secret

### 1.1 Login to Razorpay Dashboard
1. Go to: https://dashboard.razorpay.com/
2. Login with your Razorpay account
3. Make sure you're in **Test Mode** (toggle in top right)

### 1.2 Navigate to Webhooks
1. Click **Settings** (gear icon in left sidebar)
2. Click **Webhooks** from the settings menu
3. You'll see a list of webhooks (may be empty if first time)

### 1.3 Create New Webhook (or Use Existing)

**Option A: Create New Webhook**

1. Click **"Add New Webhook"** or **"Create Webhook"**
2. Fill in:
   - **Webhook URL**: 
     - Local: `http://localhost:3000/api/webhook/razorpay`
     - Production: `https://your-app.vercel.app/api/webhook/razorpay`
   - **Active Events**: Select **`payment.captured`**
   - **Description**: "eSummit Payment Webhook" (optional)
3. Click **"Create Webhook"** or **"Save"**

**Option B: Use Existing Webhook**

1. If you already have a webhook, click on it
2. Note the **Webhook Secret** (shown after creation)
3. If secret is hidden, click **"Reveal Secret"** or **"Show Secret"**

### 1.4 Copy Webhook Secret

After creating/selecting webhook, you'll see:
- **Webhook Secret**: `whsec_xxxxxxxxxxxxx` (or similar)
- **Webhook URL**: Your configured URL
- **Status**: Active/Inactive

**⚠️ IMPORTANT:** Copy the **Webhook Secret** - you'll need it for `.env`

---

## Step 2: Get Razorpay API Keys (If Not Already Done)

### 2.1 Navigate to API Keys
1. In Razorpay Dashboard → **Settings** → **API Keys**
2. You'll see:
   - **Key ID**: `rzp_test_xxxxxxxxxxxxx`
   - **Key Secret**: (hidden, click "Reveal" to see)

### 2.2 Copy Test Keys
- **Key ID**: Starts with `rzp_test_`
- **Key Secret**: Long string (keep it secret!)

---

## Step 3: Configure Environment Variables

### 3.1 Add to `.env` File

In `backend/.env`, add/update:

```env
# Razorpay API Keys (from Step 2)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here

# Razorpay Webhook Secret (from Step 1)
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Supabase (should already be set)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3.2 Verify Configuration

Test if webhook is configured:

```bash
# Start your server
cd backend
npm run dev

# In another terminal, test webhook setup
curl http://localhost:3000/api/webhook/test
```

Expected response:
```json
{
  "status": "ok",
  "webhook_configured": true,
  "supabase_configured": true,
  "message": "Webhook is ready to receive requests"
}
```

---

## Step 4: Set Up Database RPC Functions

### 4.1 Run Migration

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Copy contents from `supabase/migrations/001_confirm_payment_rpc.sql`
4. Paste and click **"Run"**
5. Verify success message

### 4.2 Verify RPC Functions Exist

Run this query:
```sql
SELECT proname FROM pg_proc 
WHERE proname IN ('confirm_payment', 'decrement_pass_stock');
```

Should return 2 rows:
- `confirm_payment`
- `decrement_pass_stock`

---

## Step 5: Test Webhook Endpoint

### 5.1 Create Test Order

```bash
# 1. Register user
POST http://localhost:3000/api/register
{
  "email": "test@example.com",
  "password": "test123",
  "name": "Test User",
  "phone": "9876543210",
  "org": "CGC",
  "year": 2026
}

# Save access_token from response

# 2. Buy a pass
POST http://localhost:3000/api/passes/1/buy
Headers: Authorization: Bearer YOUR_ACCESS_TOKEN
Body: {
  "expected_amount": 5000,
  "version": 0
}

# Save razorpay_order.id (e.g., "order_ABC123")
```

### 5.2 Test Webhook Manually

**Option A: Use Test Script**

```bash
cd backend
node test-webhook.js order_ABC123
```

**Option B: Use Razorpay Dashboard**

1. Go to **Settings** → **Webhooks**
2. Click **"Test"** or **"Send Test Webhook"** next to your webhook
3. Select event: **`payment.captured`**
4. Enter order ID: `order_ABC123` (from Step 5.1)
5. Click **"Send Test Webhook"**

### 5.3 Verify Results

**Check Backend Logs:**
```
[Webhook] Received request
[Webhook] Signature verified
[Webhook] Payment confirmed successfully
```

**Check Database:**
```sql
-- Order status should be 'success'
SELECT * FROM orders WHERE razorpay_payment_id = 'order_ABC123';

-- Stock should be decremented
SELECT stock FROM passes WHERE id = 1;
```

---

## Step 6: Production Setup (When Deploying)

### 6.1 Add Environment Variables to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add all Razorpay variables:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`

### 6.2 Update Webhook URL in Razorpay

1. Go to **Razorpay Dashboard** → **Settings** → **Webhooks**
2. Edit your webhook
3. Update **Webhook URL** to: `https://your-app.vercel.app/api/webhook/razorpay`
4. Save

### 6.3 Redeploy Backend

After adding env vars, redeploy:
- Vercel Dashboard → Deployments → "..." → Redeploy

---

## Troubleshooting

### Issue: "Webhook Secret Not Found"

**Symptoms:**
- `webhook_configured: false` in test endpoint
- Error: "Missing webhook signature or secret"

**Fix:**
1. Verify `RAZORPAY_WEBHOOK_SECRET` is in `.env`
2. Restart server after adding to `.env`
3. Check secret matches Razorpay dashboard

### Issue: "Invalid Signature"

**Symptoms:**
- Error: "Invalid webhook signature"
- Webhook receives but fails verification

**Fix:**
1. Verify webhook secret matches Razorpay dashboard exactly
2. Check for extra spaces in `.env` file
3. Ensure secret is not wrapped in quotes

### Issue: "Order Not Found"

**Symptoms:**
- Error: "Order not found"
- Webhook receives but can't find order

**Fix:**
1. Ensure order was created before webhook arrives
2. Verify `razorpay_payment_id` in orders table matches webhook `order_id`
3. Check order exists: `SELECT * FROM orders;`

### Issue: "RPC Function Not Found"

**Symptoms:**
- Warning: "RPC confirm_payment not found"
- Webhook works but uses fallback updates

**Fix:**
1. Run migration: `supabase/migrations/001_confirm_payment_rpc.sql`
2. Verify function exists: `SELECT proname FROM pg_proc WHERE proname = 'confirm_payment';`
3. Fallback will work, but RPC is more atomic

---

## Quick Checklist

- [ ] Razorpay account created
- [ ] Webhook created in Razorpay dashboard
- [ ] Webhook secret copied
- [ ] API keys copied (Key ID + Secret)
- [ ] All credentials added to `.env`
- [ ] Test endpoint shows `webhook_configured: true`
- [ ] RPC functions created in Supabase
- [ ] Test order created successfully
- [ ] Webhook test successful
- [ ] Order status updates to 'success'
- [ ] Pass stock decrements correctly

---

## Next Steps

After completing Phase 4 setup:

1. ✅ Test webhook locally
2. ✅ Deploy to production
3. ✅ Update webhook URL in Razorpay
4. ✅ Test production webhook
5. 🚀 Ready for Phase 5 (Deployment)

---

## Need Help?

- **Razorpay Docs**: https://razorpay.com/docs/webhooks/
- **Test Cards**: https://razorpay.com/docs/payments/test-cards/
- **Webhook Testing**: Use Razorpay Dashboard → Webhooks → Test
