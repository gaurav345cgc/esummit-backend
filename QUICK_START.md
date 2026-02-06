# 🚀 Quick Start - Deploy to Production in 10 Minutes

## Step-by-Step Deployment

### ✅ Step 1: Push Code to GitHub (5 min)

```bash
# In E:\E-SUMMIT folder
git init
git add .
git commit -m "Initial commit: eSummit backend"

# Create repo on GitHub.com (New Repository)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/esummit-backend.git
git branch -M main
git push -u origin main
```

---

### ✅ Step 2: Deploy to Vercel (3 min)

1. **Go to**: https://vercel.com
2. **Sign up** with GitHub (one-click)
3. **Click**: "Add New" → "Project"
4. **Import** your `esummit-backend` repository
5. **Configure**:
   - Framework Preset: **Other**
   - Root Directory: **`backend`** ⚠️ IMPORTANT!
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
   - Install Command: `npm install`
6. **Click**: "Deploy"

**Wait 2-3 minutes** → You'll get a URL like: `https://esummit-backend-xxx.vercel.app`

---

### ✅ Step 3: Add Environment Variables (2 min)

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these **7 variables**:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGc...
RAZORPAY_KEY_ID = rzp_test_xxxxx
RAZORPAY_KEY_SECRET = xxxxx
RAZORPAY_WEBHOOK_SECRET = xxxxx
NODE_ENV = production
```

**Then**: Go to Deployments → Click "..." → Redeploy (to apply env vars)

---

### ✅ Step 4: Test Your API

```bash
# Health check
curl https://your-app.vercel.app/api/health

# Should return: {"status":"ok"}
```

---

### ✅ Step 5: Configure Razorpay Webhook

1. **Razorpay Dashboard** → Settings → Webhooks
2. **Add Webhook**:
   - URL: `https://your-app.vercel.app/api/webhook/razorpay`
   - Event: `payment.captured`
3. **Copy Webhook Secret** → Add to Vercel env vars (if not done)

---

## 🎉 Done!

Your API is live at: `https://your-app.vercel.app/api`

**Share this URL with your frontend team!**

---

## 🔍 Troubleshooting

### "404 Not Found"
- Check Root Directory is set to `backend` in Vercel

### "Environment variables missing"
- Add all 7 variables in Vercel Settings
- Redeploy after adding

### "Database connection failed"
- Double-check `SUPABASE_URL` and keys are correct
- Make sure Supabase project is active

---

## 📞 Need Help?

Check `DEPLOYMENT_GUIDE.md` for detailed instructions.
