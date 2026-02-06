# eSummit Backend - Production Deployment Guide

## Phase 5: Deployment Checklist

### Prerequisites
- [ ] GitHub account (or GitLab/Bitbucket)
- [ ] Vercel account (free tier works)
- [ ] Supabase project created
- [ ] Razorpay test account

---

## Step 1: Prepare Your Code for Production

### 1.1 Create `.env.example` (for reference)
```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-test-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Server
PORT=3000
NODE_ENV=production
```

### 1.2 Update CORS for production (optional)
In `backend/server.js`, change CORS to your frontend domain:
```js
cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend.vercel.app',
})
```

---

## Step 2: Push Code to GitHub

### 2.1 Initialize Git (if not done)
```bash
cd E:\E-SUMMIT
git init
git add .
git commit -m "Initial commit: eSummit backend MVP"
```

### 2.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create repository: `esummit-backend`
3. **Don't** initialize with README
4. Copy the repository URL

### 2.3 Push Code
```bash
git remote add origin https://github.com/yourusername/esummit-backend.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Login to Vercel
- Go to https://vercel.com
- Sign up with GitHub (recommended)

### 3.2 Import Project
1. Click **"Add New"** → **"Project"**
2. Import your GitHub repository (`esummit-backend`)
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `backend` (important!)
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`

### 3.3 Set Environment Variables
In Vercel project settings → **Environment Variables**, add:

```
SUPABASE_URL = https://your-project-id.supabase.co
SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
RAZORPAY_KEY_ID = rzp_test_xxxxx
RAZORPAY_KEY_SECRET = your-test-secret
RAZORPAY_WEBHOOK_SECRET = your-webhook-secret
NODE_ENV = production
PORT = 3000
```

### 3.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Copy your deployment URL: `https://esummit-backend.vercel.app`

---

## Step 4: Configure Supabase

### 4.1 Run Database Migrations
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/001_confirm_payment_rpc.sql`
3. Verify functions exist: `confirm_payment` and `decrement_pass_stock`

### 4.2 Deploy Edge Function (Optional)
```bash
cd supabase
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy razorpay-webhook
```

Set Edge Function secrets:
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 5: Configure Razorpay Webhook

### 5.1 Get Webhook Secret
1. Razorpay Dashboard → Settings → Webhooks
2. Create new webhook or use existing
3. Copy the **Webhook Secret**

### 5.2 Set Webhook URL
- **Option A (Express endpoint - Recommended)**:
  ```
  https://esummit-backend.vercel.app/api/webhook/razorpay
  ```
- **Option B (Edge Function)**:
  ```
  https://your-project-ref.supabase.co/functions/v1/razorpay-webhook
  ```

### 5.3 Select Events
- ✅ `payment.captured`
- Save webhook

---

## Step 6: Test Production Deployment

### 6.1 Health Check
```bash
curl https://esummit-backend.vercel.app/api/health
```
Expected: `{"status":"ok"}`

### 6.2 Test Registration
```bash
curl -X POST https://esummit-backend.vercel.app/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User",
    "phone": "9876543210",
    "org": "CGC",
    "year": 2026
  }'
```

### 6.3 Test Pass Purchase Flow
1. Login → Get `access_token`
2. Buy pass → Get `razorpay_order.id`
3. Complete payment in Razorpay test mode
4. Verify webhook updates order status

---

## Step 7: Production Checklist

- [ ] Vercel deployment successful
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] RPC functions created
- [ ] Razorpay webhook configured
- [ ] Health check works
- [ ] Auth endpoints work
- [ ] Buy flow works end-to-end
- [ ] Webhook receives and processes payments
- [ ] Stock decrements correctly

---

## Step 8: Monitoring & Maintenance

### 8.1 Vercel Logs
- View logs: Vercel Dashboard → Your Project → Deployments → Logs

### 8.2 Supabase Monitoring
- Dashboard → Reports → Check DB size, API calls

### 8.3 Cron Ping (Auto-configured)
- Vercel cron runs daily: `0 0 * * *` → `/api/cron/ping`
- Keeps Supabase active (prevents auto-pause)

---

## Troubleshooting

### Issue: "Function not found"
- Check Root Directory is set to `backend` in Vercel
- Verify `server.js` exists in `backend/` folder

### Issue: "Environment variables missing"
- Double-check all vars are set in Vercel
- Redeploy after adding vars

### Issue: "Webhook not working"
- Check webhook URL is correct
- Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
- Check Vercel logs for errors

### Issue: "Database connection failed"
- Verify `SUPABASE_URL` and keys are correct
- Check Supabase project is active (not paused)

---

## API Base URL

After deployment, your API base URL will be:
```
https://esummit-backend.vercel.app/api
```

Share this with your frontend team!

---

## Next Steps

1. ✅ Deploy backend to Vercel
2. ✅ Test all endpoints
3. ✅ Configure webhooks
4. 🔄 Deploy frontend (separate project)
5. 🔄 Connect frontend to backend API
6. 🚀 Go live!
