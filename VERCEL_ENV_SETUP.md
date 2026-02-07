# Fix: Missing Webhook Secret in Vercel

## Problem
Getting `"Missing webhook signature or secret"` error when testing webhook on production.

## Solution: Add Environment Variable to Vercel

### Step 1: Add RAZORPAY_WEBHOOK_SECRET to Vercel

1. **Go to**: https://vercel.com/dashboard
2. **Click** on your project: `esummit-backend-dun`
3. **Go to**: Settings → Environment Variables
4. **Add New Variable**:
   - **Key**: `RAZORPAY_WEBHOOK_SECRET`
   - **Value**: `whsec_xxxxxxxxxxxxx` (your webhook secret from Razorpay)
   - **Environment**: Select all (Production, Preview, Development)
   - **Click**: "Save"

### Step 2: Redeploy

After adding the variable, you MUST redeploy:

1. **Go to**: Deployments tab
2. **Click**: "..." (three dots) on latest deployment
3. **Click**: "Redeploy"
4. **Wait**: 2-3 minutes for deployment to complete

### Step 3: Verify

After redeploy, test again:

```bash
node test-webhook.js order_SCwx7BI4PX5N3N
```

Should now work! ✅

---

## All Required Environment Variables in Vercel

Make sure you have ALL of these set:

```
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ RAZORPAY_KEY_ID
✅ RAZORPAY_KEY_SECRET
✅ RAZORPAY_WEBHOOK_SECRET  ← This one was missing!
✅ NODE_ENV = production
```

---

## Quick Fix Checklist

- [ ] Login to Vercel Dashboard
- [ ] Go to Project → Settings → Environment Variables
- [ ] Add `RAZORPAY_WEBHOOK_SECRET` with your webhook secret
- [ ] Select all environments (Production, Preview, Development)
- [ ] Save
- [ ] Go to Deployments → Redeploy latest
- [ ] Wait for deployment to complete
- [ ] Test webhook again

---

## Why This Happened

Environment variables in `.env` file are only for **local development**. When you deploy to Vercel, you need to set them in Vercel Dashboard separately.

---

## After Fix

Once redeployed, your webhook should work! Test with:

```bash
node test-webhook.js order_SCwx7BI4PX5N3N
```

Expected: ✅ Success!
