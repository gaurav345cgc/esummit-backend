# Postman API Testing Guide - Complete End-to-End Flow

## 🚀 Quick Start

**Base URL**: `http://localhost:3000/api` (local) or `https://esummit-backend-dun.vercel.app/api` (production)

---

## 📋 Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Profile Management](#2-profile-management)
3. [Events & Passes](#3-events--passes)
4. [Purchase Flow](#4-purchase-flow)
5. [Orders & Dashboard](#5-orders--dashboard)
6. [Webhook Testing](#6-webhook-testing)
7. [Logical Test Scenarios](#7-logical-test-scenarios)

---

## 1. Authentication Flow

### 1.1 Register New User

**Endpoint**: `POST /api/register`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "testuser@example.com",
  "password": "Test123!@#",
  "name": "Test User",
  "phone": "9876543210",
  "org": "CGC",
  "year": 2026
}
```

**Expected Response** (201 Created):
```json
{
  "user": {
    "id": "uuid-here",
    "email": "testuser@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "mode": "register"
}
```

**Save**: Copy `access_token` → Set as Postman variable `{{access_token}}`

---

### 1.2 Login User

**Endpoint**: `POST /api/login`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "testuser@example.com",
  "password": "Test123!@#"
}
```

**Expected Response** (200 OK):
```json
{
  "user": {
    "id": "uuid-here",
    "email": "testuser@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save**: Update `{{access_token}}` variable

---

## 2. Profile Management

### 2.1 Get Profile

**Endpoint**: `GET /api/profile`

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Expected Response** (200 OK):
```json
{
  "id": "uuid-here",
  "name": "Test User",
  "email": "testuser@example.com",
  "phone": "9876543210",
  "org": "CGC",
  "year": 2026,
  "created_at": "2026-02-07T04:00:00.000Z"
}
```

---

### 2.2 Update Profile

**Endpoint**: `PUT /api/profile`

**Headers**:
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "phone": "9999999999",
  "org": "Updated Org",
  "year": 2025
}
```

**Expected Response** (200 OK):
```json
{
  "updated": {
    "id": "uuid-here",
    "name": "Updated Name",
    "email": "testuser@example.com",
    "phone": "9999999999",
    "org": "Updated Org",
    "year": 2025,
    "created_at": "2026-02-07T04:00:00.000Z"
  }
}
```

**Test**: Get profile again → Verify changes persisted

---

## 3. Events & Passes

### 3.1 List All Events

**Endpoint**: `GET /api/events`

**Headers**: None required

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "name": "eSummit CGC Mohali",
    "description": "Entrepreneurship Summit at CGC Landran, Mohali.",
    "start_date": "2026-02-11T04:30:00+00:00",
    "venue": "CGC Landran",
    "is_active": true
  }
]
```

**Save**: Copy `id` → Set as `{{event_id}}`

---

### 3.2 Get Event Details with Countdown

**Endpoint**: `GET /api/events/{{event_id}}`

**Headers**: None required

**Expected Response** (200 OK):
```json
{
  "event": {
    "id": 1,
    "name": "eSummit CGC Mohali",
    "description": "Entrepreneurship Summit at CGC Landran, Mohali.",
    "start_date": "2026-02-11T04:30:00+00:00",
    "venue": "CGC Landran",
    "is_active": true
  },
  "countdown_ms": 345600000
}
```

**Verify**: `countdown_ms` is positive (milliseconds until event starts)

---

### 3.3 List All Passes

**Endpoint**: `GET /api/passes`

**Headers**: None required

**Expected Response** (200 OK):
```json
[
  {
    "id": 1,
    "type": "Gold",
    "price": 5000,
    "stock": 49,
    "perks": ["Front-row seating", "Networking access"],
    "row_version": 1
  },
  {
    "id": 2,
    "type": "Silver",
    "price": 3000,
    "stock": 100,
    "perks": ["Standard seating"],
    "row_version": 0
  },
  {
    "id": 3,
    "type": "Platinum",
    "price": 10000,
    "stock": 20,
    "perks": ["VIP seating", "Backstage access", "Speaker meetup"],
    "row_version": 0
  },
  {
    "id": 4,
    "type": "Priority",
    "price": 2000,
    "stock": 199,
    "perks": ["Queue jump"],
    "row_version": 0
  }
]
```

**Save**: 
- Copy first pass `id` → Set as `{{pass_id}}`
- Copy first pass `price` → Set as `{{pass_price}}`
- Copy first pass `type` → Set as `{{pass_type}}`
- Copy first pass `stock` → Set as `{{initial_stock}}`

**Verify**: All passes have `stock > 0` (at least one available)

**Note**: Passes are now ordered by price (highest first):
- Priority: ₹15,000 (Highest)
- Platinum: ₹10,000
- Gold: ₹5,000
- Silver: ₹3,000 (Lowest)

---

## 4. Purchase Flow

### 4.1 Buy Pass

**Endpoint**: `POST /api/passes/{{pass_id}}/buy`

**Headers**:
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body**:
```json
{
  "expected_amount": {{pass_price}},
  "version": 0
}
```

**Expected Response** (201 Created):
```json
{
  "razorpay_order": {
    "id": "order_ABC123XYZ",
    "amount": 500000,
    "amount_inr": 5000,
    "currency": "INR"
  },
  "pass": {
    "id": 1,
    "type": "Gold",
    "price": 5000
  },
  "order_status": "pending"
}
```

**Save**: 
- Copy `razorpay_order.id` → Set as `{{razorpay_order_id}}`
- Copy `pass.id` → Verify matches `{{pass_id}}`
- Copy `pass.type` → Verify matches `{{pass_type}}`

**Verify**:
- ✅ `razorpay_order.amount` = `pass.price * 100` (in paise)
- ✅ `razorpay_order.amount_inr` = `pass.price`
- ✅ `pass.id` matches purchased pass
- ✅ `order_status` is "pending"

---

### 4.2 Upgrade Pass

**Endpoint**: `POST /api/passes/:id/upgrade`

**Headers**:
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body**:
```json
{
  "expected_amount": 2000,
  "version": 0
}
```

**Note**: 
- `:id` is the pass ID you want to upgrade TO (must be higher tier)
- `expected_amount` is the upgrade price (difference between new and current pass)
- You must have a successful pass (status = "success") to upgrade

**Expected Response** (201 Created):
```json
{
  "razorpay_order": {
    "id": "order_ABC123",
    "amount": 200000,
    "amount_inr": 2000,
    "currency": "INR"
  },
  "upgrade_details": {
    "from_pass": {
      "id": 2,
      "type": "Silver",
      "price": 3000
    },
    "to_pass": {
      "id": 1,
      "type": "Gold",
      "price": 5000
    },
    "upgrade_price": 2000
  },
  "order_status": "pending"
}
```

**Upgrade Examples**:
- Silver (₹3,000) → Gold (₹5,000): Pay ₹2,000
- Gold (₹5,000) → Platinum (₹10,000): Pay ₹5,000
- Platinum (₹10,000) → Priority (₹15,000): Pay ₹5,000
- Gold (₹5,000) → Priority (₹15,000): Pay ₹10,000

**Error Cases**:
- No existing pass: `400 - "No existing pass found. Please purchase a pass first before upgrading."`
- Same/lower tier: `400 - "Cannot upgrade to Gold. You already have Gold or a higher tier pass."`
- Wrong amount: `400 - "Expected amount does not match upgrade price"`

---

## 5. Orders & Dashboard

### 5.1 Get User Orders

**Endpoint**: `GET /api/orders`

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Expected Response** (200 OK):
```json
[
  {
    "id": "order-uuid-here",
    "status": "pending",
    "created_at": "2026-02-07T04:00:00.000Z",
    "razorpay_payment_id": "order_ABC123XYZ",
    "passes": {
      "id": 1,
      "type": "Gold",
      "price": 5000
    }
  }
]
```

**Save**: Copy first order `id` → Set as `{{order_id}}`

**Verify**:
- ✅ Order exists in list
- ✅ `razorpay_payment_id` matches `{{razorpay_order_id}}`
- ✅ `passes.id` matches `{{pass_id}}`
- ✅ `passes.type` matches `{{pass_type}}`
- ✅ `status` is "pending"

**Logical Test**: 
- If you just bought a pass, this order should appear
- Pass details should match what you purchased

---

### 5.2 Get Dashboard

**Endpoint**: `GET /api/dashboard`

**Headers**:
```
Authorization: Bearer {{access_token}}
```

**Expected Response** (200 OK):
```json
{
  "profile": {
    "id": "uuid-here",
    "name": "Test User",
    "email": "testuser@example.com",
    "phone": "9876543210",
    "org": "CGC",
    "year": 2026,
    "created_at": "2026-02-07T04:00:00.000Z"
  },
  "events": [
    {
      "id": 1,
      "name": "eSummit CGC Mohali",
      "description": "Entrepreneurship Summit at CGC Landran, Mohali.",
      "start_date": "2026-02-11T04:30:00+00:00",
      "venue": "CGC Landran",
      "is_active": true
    }
  ],
  "my_passes": [
    {
      "id": "order-uuid-here",
      "status": "pending",
      "created_at": "2026-02-07T04:00:00.000Z",
      "razorpay_payment_id": "order_ABC123XYZ",
      "passes": {
        "id": 1,
        "type": "Gold",
        "price": 5000
      }
    }
  ],
  "countdown_ms": 345600000
}
```

**Verify**:
- ✅ `profile` matches user profile
- ✅ `events` contains active events
- ✅ `my_passes` contains orders with pass details
- ✅ `countdown_ms` is positive number
- ✅ Order in `my_passes` matches `{{order_id}}`
- ✅ Pass in `my_passes` matches purchased pass

**Logical Test**:
- After buying a pass, `my_passes` should include it
- Pass details should match what you bought

---

## 6. Webhook Testing

### 6.1 Simulate Razorpay Webhook

**Endpoint**: `POST /api/webhook/razorpay`

**Headers**:
```
Content-Type: application/json
x-razorpay-signature: {{webhook_signature}}
```

**Request Body**:
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_TEST123",
        "order_id": "{{razorpay_order_id}}",
        "amount": {{pass_price}}00,
        "currency": "INR",
        "status": "captured",
        "created_at": 1707288000
      }
    }
  }
}
```

**Note**: Signature must be calculated. Use test script or Postman Pre-request Script:

**Pre-request Script** (Postman):
```javascript
const crypto = require('crypto');
const body = JSON.stringify(pm.request.body.raw);
const secret = pm.environment.get('RAZORPAY_WEBHOOK_SECRET');
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
pm.request.headers.add({
    key: 'x-razorpay-signature',
    value: signature
});
```

**Expected Response** (200 OK):
```json
{
  "ok": true,
  "message": "Payment confirmed",
  "order_id": "order-uuid-here"
}
```

**After Webhook**:
1. Get orders again → Status should be "success"
2. Get dashboard → Order status should be "success"
3. Get passes → Stock should be decremented by 1

---

## 7. Logical Test Scenarios

### Scenario 1: Complete Purchase Flow

**Steps**:
1. ✅ Register user → Save `access_token`
2. ✅ Get passes → Note `{{pass_id}}`, `{{pass_price}}`, `{{initial_stock}}`
3. ✅ Buy pass → Save `{{razorpay_order_id}}`
4. ✅ Get orders → Verify order appears with correct pass
5. ✅ Get dashboard → Verify pass in `my_passes`
6. ✅ Simulate webhook → Confirm payment
7. ✅ Get orders again → Verify status = "success"
8. ✅ Get passes again → Verify stock decreased by 1

**Expected Results**:
- Order created with correct pass
- Order appears in list
- Pass appears in dashboard
- After webhook: status = "success", stock decreased

---

### Scenario 2: Multiple Purchases

**Steps**:
1. ✅ Register user
2. ✅ Buy Pass 1 (Gold) → Save order ID 1
3. ✅ Buy Pass 2 (Silver) → Save order ID 2
4. ✅ Get orders → Should show 2 orders
5. ✅ Get dashboard → `my_passes` should have 2 passes
6. ✅ Verify both passes have correct details

**Expected Results**:
- Both orders appear in list
- Both passes appear in dashboard
- Each order has correct pass details

---

### Scenario 3: Stock Verification

**Steps**:
1. ✅ Get passes → Note `{{initial_stock}}` for pass ID 1
2. ✅ Buy pass ID 1
3. ✅ Simulate webhook
4. ✅ Get passes again → Verify stock = `{{initial_stock}} - 1`

**Expected Results**:
- Stock decreases by exactly 1
- Other passes' stock unchanged

---

### Scenario 4: Profile Update Verification

**Steps**:
1. ✅ Register user
2. ✅ Get profile → Note original name
3. ✅ Update profile → Change name
4. ✅ Get profile again → Verify name changed
5. ✅ Get dashboard → Verify profile name updated

**Expected Results**:
- Profile updates correctly
- Changes persist across endpoints

---

### Scenario 5: Pass Availability Check

**Steps**:
1. ✅ Get passes → Find pass with `stock = 1`
2. ✅ Buy that pass
3. ✅ Simulate webhook
4. ✅ Get passes again → Verify `stock = 0`
5. ✅ Try to buy same pass again → Should fail or show out of stock

**Expected Results**:
- Stock updates correctly
- Cannot buy pass with 0 stock

---

### Scenario 6: Order Status Flow

**Steps**:
1. ✅ Buy pass → Order status = "pending"
2. ✅ Get orders → Verify status = "pending"
3. ✅ Simulate webhook
4. ✅ Get orders → Verify status = "success"
5. ✅ Get dashboard → Verify status = "success"

**Expected Results**:
- Status changes from "pending" → "success"
- Status consistent across endpoints

---

## 8. Postman Collection Setup

### Environment Variables

Create Postman Environment with:

```
base_url: http://localhost:3000/api
access_token: (set after login/register)
event_id: 1
pass_id: 1
pass_price: 5000
pass_type: Gold
razorpay_order_id: (set after purchase)
order_id: (set after purchase)
RAZORPAY_WEBHOOK_SECRET: ecell-sarang
```

### Collection Structure

```
eSummit Backend API
├── 1. Authentication
│   ├── Register User
│   └── Login User
├── 2. Profile
│   ├── Get Profile
│   └── Update Profile
├── 3. Events
│   ├── List Events
│   └── Get Event Details
├── 4. Passes
│   └── List Passes
├── 5. Purchase
│   └── Buy Pass
├── 6. Orders
│   └── Get Orders
├── 7. Dashboard
│   └── Get Dashboard
└── 8. Webhook
    └── Simulate Webhook
```

---

## 9. Test Assertions (Postman Tests Tab)

### Register User - Tests
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has access_token", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('access_token');
    pm.environment.set("access_token", jsonData.access_token);
});

pm.test("Response has user ID", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.user).to.have.property('id');
});
```

### Buy Pass - Tests
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has razorpay_order", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('razorpay_order');
    pm.environment.set("razorpay_order_id", jsonData.razorpay_order.id);
});

pm.test("Pass matches purchased pass", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.pass.id).to.eql(parseInt(pm.environment.get("pass_id")));
    pm.expect(jsonData.pass.type).to.eql(pm.environment.get("pass_type"));
});

pm.test("Amount is correct", function () {
    var jsonData = pm.response.json();
    var expectedAmount = parseInt(pm.environment.get("pass_price")) * 100;
    pm.expect(jsonData.razorpay_order.amount).to.eql(expectedAmount);
});
```

### Get Orders - Tests
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Orders is an array", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.be.an('array');
});

pm.test("Order contains purchased pass", function () {
    var jsonData = pm.response.json();
    var order = jsonData.find(o => o.razorpay_payment_id === pm.environment.get("razorpay_order_id"));
    pm.expect(order).to.exist;
    pm.expect(order.passes.id).to.eql(parseInt(pm.environment.get("pass_id")));
    pm.environment.set("order_id", order.id);
});
```

### Get Dashboard - Tests
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Dashboard has my_passes", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('my_passes');
    pm.expect(jsonData.my_passes).to.be.an('array');
});

pm.test("Purchased pass appears in my_passes", function () {
    var jsonData = pm.response.json();
    var pass = jsonData.my_passes.find(p => p.id === pm.environment.get("order_id"));
    pm.expect(pass).to.exist;
    pm.expect(pass.passes.id).to.eql(parseInt(pm.environment.get("pass_id")));
});
```

---

## 10. Complete End-to-End Test Flow

### Full Test Sequence

1. **Setup**
   - Register user → Save token
   - Get passes → Save pass details

2. **Purchase**
   - Buy pass → Save Razorpay order ID
   - Verify order created
   - Verify pass in orders list
   - Verify pass in dashboard

3. **Payment Confirmation**
   - Simulate webhook
   - Verify order status = "success"
   - Verify stock decreased
   - Verify pass still in dashboard with "success" status

4. **Verification**
   - Get orders → All orders show correct status
   - Get dashboard → All passes show correct status
   - Get passes → Stock updated correctly

---

## 11. Common Test Cases

### Test Case 1: Unauthorized Access
- **Request**: `GET /api/profile` (no token)
- **Expected**: `401 Unauthorized`

### Test Case 2: Invalid Token
- **Request**: `GET /api/profile` with invalid token
- **Expected**: `401 Unauthorized`

### Test Case 3: Pass Out of Stock
- **Request**: `POST /api/passes/1/buy` (if stock = 0)
- **Expected**: `400 Bad Request` or stock check fails

### Test Case 4: Wrong Amount
- **Request**: `POST /api/passes/1/buy` with wrong `expected_amount`
- **Expected**: `400 Bad Request` - "Expected amount does not match pass price"

### Test Case 5: Invalid Pass ID
- **Request**: `POST /api/passes/999/buy`
- **Expected**: `404 Not Found` - "Pass not found"

---

## 12. Health Check

**Endpoint**: `GET /api/health`

**Expected Response** (200 OK):
```json
{
  "status": "ok"
}
```

Use this to verify server is running before testing.

---

## Quick Reference Card

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Server health |
| `/register` | POST | No | Create account |
| `/login` | POST | No | Get token |
| `/profile` | GET | Yes | Get profile |
| `/profile` | PUT | Yes | Update profile |
| `/events` | GET | No | List events |
| `/events/:id` | GET | No | Event details |
| `/passes` | GET | No | List passes |
| `/passes/:id/buy` | POST | Yes | Purchase pass |
| `/orders` | GET | Yes | User orders |
| `/dashboard` | GET | Yes | Full dashboard |
| `/webhook/razorpay` | POST | No* | Payment webhook |

*Webhook requires signature, not token

---

## Tips for Testing

1. **Use Variables**: Save tokens, IDs, etc. as Postman variables
2. **Run in Sequence**: Follow logical flow (register → buy → verify)
3. **Check Responses**: Verify all expected fields exist
4. **Test Edge Cases**: Empty stock, invalid IDs, wrong amounts
5. **Verify Consistency**: Same data across different endpoints
6. **Clean Up**: Delete test users/orders after testing (optional)

---

## Success Criteria

✅ All endpoints return expected status codes  
✅ Authentication works correctly  
✅ Purchase flow completes successfully  
✅ Orders appear in list after purchase  
✅ Passes appear in dashboard after purchase  
✅ Webhook updates order status correctly  
✅ Stock decreases after successful payment  
✅ Data consistency across all endpoints  

---

**Happy Testing! 🚀**
