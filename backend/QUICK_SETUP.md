# Quick Setup - Razorpay Webhook (5 Minutes)

## Step 1: Get Webhook Secret (2 min)

1. **Go to**: https://dashboard.razorpay.com/ → Login
2. **Click**: Settings → Webhooks
3. **Create Webhook** (or use existing):
   - URL: `http://localhost:3000/api/webhook/razorpay` (for local)
   - Event: `payment.captured`
   - Click "Create"
4. **Copy Webhook Secret**: `whsec_xxxxx` (shown after creation)

---

## Step 2: Add to .env (1 min)

In `backend/.env`, add:

```env
RAZORPAY_WEBHOOK_SECRET=whsec_xxxxx
```

*(You should already have `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`)*

---

## Step 3: Test Setup (2 min)

```bash
# 1. Restart server
cd backend
npm run dev

# 2. Test webhook config
curl http://localhost:3000/api/webhook/test
```

**Expected:**
```json
{
  "status": "ok",
  "webhook_configured": true,
  "supabase_configured": true,
  "message": "Webhook is ready to receive requests"
}
```

---

## ✅ Done!

If `webhook_configured: true`, you're ready to test!

See `RAZORPAY_TESTING_GUIDE.md` for full testing steps.
