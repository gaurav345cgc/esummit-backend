# End-to-End Test Guide

## Quick Start

### Run E2E Test (Local Server)
```powershell
# Make sure server is running: npm run dev
node test-e2e-flow.js
```

### Run E2E Test (Production)
```powershell
node test-e2e-flow.js https://esummit-backend-dun.vercel.app
```

### Using npm script
```powershell
npm run test:e2e          # Local
npm run test:e2e:prod     # Production
```

---

## What the Test Does

The E2E test simulates a complete user journey:

1. **Health Check** - Verifies server is running
2. **Register User** - Creates new user account
3. **Get Profile** - Fetches user profile
4. **View Events** - Lists all active events
5. **View Passes** - Lists all available passes
6. **Buy Pass** - Purchases a pass (creates Razorpay order)
7. **Get Orders** - Fetches user's orders
8. **Simulate Webhook** - Simulates Razorpay payment confirmation
9. **Verify Order Status** - Confirms order status updated to 'success'
10. **Get Dashboard** - Fetches complete dashboard data

---

## Test Flow Details

### Step 1: Health Check
- **Endpoint**: `GET /api/health`
- **Expected**: `{"status":"ok"}`

### Step 2: Register User
- **Endpoint**: `POST /api/register`
- **Creates**: New user with unique email
- **Returns**: `access_token` and `user.id`

### Step 3: Get Profile
- **Endpoint**: `GET /api/profile`
- **Auth**: Required (Bearer token)
- **Returns**: User profile data

### Step 4: View Events
- **Endpoint**: `GET /api/events`
- **Returns**: List of active events

### Step 5: View Passes
- **Endpoint**: `GET /api/passes`
- **Returns**: List of passes with stock
- **Selects**: First pass with stock > 0

### Step 6: Buy Pass
- **Endpoint**: `POST /api/passes/:id/buy`
- **Auth**: Required
- **Creates**: Razorpay order
- **Returns**: `razorpay_order.id`

### Step 7: Get Orders
- **Endpoint**: `GET /api/orders`
- **Auth**: Required
- **Returns**: User's orders
- **Finds**: Order matching Razorpay order ID

### Step 8: Simulate Webhook
- **Endpoint**: `POST /api/webhook/razorpay`
- **Requires**: `RAZORPAY_WEBHOOK_SECRET env var
- **Simulates**: Payment captured event
- **Updates**: Order status to 'success'

### Step 9: Verify Order Status
- **Endpoint**: `GET /api/orders`
- **Verifies**: Order status is now 'success'
- **Confirms**: Webhook processed correctly

### Step 10: Get Dashboard
- **Endpoint**: `GET /api/dashboard`
- **Auth**: Required
- **Returns**: Complete dashboard data
- **Includes**: Profile, events, orders, countdown

---

## Prerequisites

### Required
- Server running (local or production)
- Database seeded (events and passes exist)
- `RAZORPAY_WEBHOOK_SECRET` set (for webhook step)

### Optional
- At least one pass with stock > 0
- At least one active event

---

## Environment Variables

For webhook step to work:
```powershell
# PowerShell
$env:RAZORPAY_WEBHOOK_SECRET = "your_webhook_secret"

# Or add to .env file
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

## Expected Output

```
============================================================
🚀 End-to-End User Flow Test
   Server: http://localhost:3000
============================================================

[STEP 1] Checking server health...
✅ Server is healthy

[STEP 2] Registering new user...
✅ User registered: test_1234567890@example.com
ℹ️  User ID: abc-123-def-456
ℹ️  Token: eyJhbGciOiJIUzI1NiIs...

[STEP 3] Fetching user profile...
✅ Profile fetched successfully

[STEP 4] Fetching events...
✅ Found 1 event(s)

[STEP 5] Fetching passes...
✅ Found 4 pass(es)
ℹ️  Will purchase: Gold (ID: 1, Price: ₹5000)

[STEP 6] Purchasing pass ID: 1...
✅ Pass purchase initiated
ℹ️  Razorpay Order ID: order_ABC123

[STEP 7] Fetching user orders...
✅ Found order: uuid-here
ℹ️  Status: pending

[STEP 8] Simulating Razorpay webhook...
✅ Webhook processed successfully

[STEP 9] Verifying order status after webhook...
✅ Order status updated to SUCCESS

[STEP 10] Fetching dashboard...
✅ Dashboard fetched successfully

============================================================
📊 Test Summary
============================================================
Total Steps: 10
Passed: 10
Failed: 0

🎉 All tests passed!
```

---

## Troubleshooting

### Issue: "Health check failed"
**Fix**: Make sure server is running
```powershell
npm run dev
```

### Issue: "Registration failed"
**Fix**: 
- Check database connection
- Verify Supabase credentials in `.env`
- Check if email already exists (test uses unique timestamp)

### Issue: "No passes with stock available"
**Fix**: Seed database with passes that have stock > 0
```sql
UPDATE passes SET stock = 10 WHERE id = 1;
```

### Issue: "Webhook simulation failed"
**Fix**: Set webhook secret
```powershell
$env:RAZORPAY_WEBHOOK_SECRET = "your_secret"
```

### Issue: "Order status not updated"
**Fix**: 
- Check webhook processed correctly
- Verify RPC function exists in database
- Check database logs

---

## Customization

### Test Different Server
```powershell
node test-e2e-flow.js https://your-server.com
```

### Modify Test User
Edit `TEST_USER` object in `test-e2e-flow.js`:
```javascript
const TEST_USER = {
  email: `custom_${Date.now()}@example.com`,
  password: 'YourPassword123',
  name: 'Custom Test User',
  // ...
};
```

### Skip Webhook Step
Comment out step 8 in the test if webhook secret is not set.

---

## Integration with CI/CD

Add to your CI pipeline:
```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm run test:e2e:prod
  env:
    RAZORPAY_WEBHOOK_SECRET: ${{ secrets.RAZORPAY_WEBHOOK_SECRET }}
```

---

## Next Steps

After E2E test passes:
1. ✅ All API endpoints working
2. ✅ Authentication flow working
3. ✅ Payment flow working
4. ✅ Webhook processing working
5. ✅ Database updates working
6. 🚀 Ready for frontend integration!
