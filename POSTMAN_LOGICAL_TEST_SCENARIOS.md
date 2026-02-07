# Postman Logical Test Scenarios

## Complete End-to-End Test Flows

---

## Scenario 1: Complete Purchase Flow with Verification

### Step-by-Step Flow

**1. Health Check**
```
GET /api/health
Expected: {"status":"ok"}
```

**2. Register User**
```
POST /api/register
Body: {
  "email": "buyer@example.com",
  "password": "Test123!@#",
  "name": "Test Buyer",
  "phone": "9876543210",
  "org": "CGC",
  "year": 2026
}
Expected: { "access_token": "...", "user": {...} }
Save: access_token → {{access_token}}
```

**3. Get Passes (Before Purchase)**
```
GET /api/passes
Expected: Array of passes
Save: First pass with stock > 0
  - id → {{pass_id}}
  - price → {{pass_price}}
  - type → {{pass_type}}
  - stock → {{initial_stock}}
```

**4. Buy Pass**
```
POST /api/passes/{{pass_id}}/buy
Headers: Authorization: Bearer {{access_token}}
Body: {
  "expected_amount": {{pass_price}},
  "version": 0
}
Expected: {
  "razorpay_order": { "id": "order_XXX" },
  "pass": { "id": {{pass_id}}, "type": "{{pass_type}}" }
}
Save: razorpay_order.id → {{razorpay_order_id}}
```

**5. Verify Order Created (Logical Test)**
```
GET /api/orders
Headers: Authorization: Bearer {{access_token}}
Expected: Array containing order with:
  - razorpay_payment_id = {{razorpay_order_id}}
  - passes.id = {{pass_id}}
  - passes.type = {{pass_type}}
  - status = "pending"
Save: order.id → {{order_id}}

✅ VERIFY: Order exists and contains correct pass
```

**6. Verify Pass in Dashboard (Logical Test)**
```
GET /api/dashboard
Headers: Authorization: Bearer {{access_token}}
Expected: {
  "my_passes": [
    {
      "id": {{order_id}},
      "status": "pending",
      "passes": {
        "id": {{pass_id}},
        "type": "{{pass_type}}",
        "price": {{pass_price}}
      }
    }
  ]
}

✅ VERIFY: 
  - my_passes array contains the order
  - Pass details match purchased pass
  - Status is "pending"
```

**7. Simulate Webhook (Payment Confirmation)**
```
POST /api/webhook/razorpay
Headers: 
  Content-Type: application/json
  x-razorpay-signature: (calculated)
Body: {
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_TEST",
        "order_id": "{{razorpay_order_id}}",
        "amount": {{pass_price}}00
      }
    }
  }
}
Expected: { "ok": true, "message": "Payment confirmed" }
```

**8. Verify Order Status Updated (Logical Test)**
```
GET /api/orders
Headers: Authorization: Bearer {{access_token}}
Expected: Order with:
  - id = {{order_id}}
  - status = "success" ✅ (changed from "pending")
  - passes.id = {{pass_id}}

✅ VERIFY: Status changed to "success"
```

**9. Verify Pass in Dashboard After Payment (Logical Test)**
```
GET /api/dashboard
Headers: Authorization: Bearer {{access_token}}
Expected: {
  "my_passes": [
    {
      "id": {{order_id}},
      "status": "success", ✅ (updated)
      "passes": {
        "id": {{pass_id}},
        "type": "{{pass_type}}"
      }
    }
  ]
}

✅ VERIFY: 
  - Pass still appears in my_passes
  - Status is now "success"
  - Pass details unchanged
```

**10. Verify Stock Decremented (Logical Test)**
```
GET /api/passes
Expected: Pass with:
  - id = {{pass_id}}
  - stock = {{initial_stock}} - 1 ✅

✅ VERIFY: Stock decreased by exactly 1
```

---

## Scenario 2: Multiple Purchases Verification

### Flow

**1. Register User**
```
POST /api/register
Save: access_token
```

**2. Buy First Pass (Gold)**
```
POST /api/passes/1/buy
Body: { "expected_amount": 5000, "version": 0 }
Save: razorpay_order_id_1
```

**3. Buy Second Pass (Silver)**
```
POST /api/passes/2/buy
Body: { "expected_amount": 3000, "version": 0 }
Save: razorpay_order_id_2
```

**4. Verify Both Orders Appear (Logical Test)**
```
GET /api/orders
Expected: Array with 2 orders:
  - Order 1: razorpay_payment_id = {{razorpay_order_id_1}}, passes.id = 1
  - Order 2: razorpay_payment_id = {{razorpay_order_id_2}}, passes.id = 2

✅ VERIFY: 
  - Both orders exist
  - Each has correct pass
  - Orders array length = 2
```

**5. Verify Both Passes in Dashboard (Logical Test)**
```
GET /api/dashboard
Expected: {
  "my_passes": [
    { "passes": { "id": 1, "type": "Gold" } },
    { "passes": { "id": 2, "type": "Silver" } }
  ]
}

✅ VERIFY:
  - my_passes.length = 2
  - Both passes appear
  - Correct pass details for each
```

---

## Scenario 3: Stock Verification Flow

### Flow

**1. Get Initial Stock**
```
GET /api/passes
Find pass with id = 1
Save: initial_stock = passes[0].stock (e.g., 49)
```

**2. Buy Pass**
```
POST /api/passes/1/buy
Body: { "expected_amount": 5000, "version": 0 }
```

**3. Simulate Webhook**
```
POST /api/webhook/razorpay
Body: { "event": "payment.captured", ... }
```

**4. Verify Stock Decremented (Logical Test)**
```
GET /api/passes
Expected: Pass with id = 1:
  - stock = {{initial_stock}} - 1 ✅

✅ VERIFY: Stock decreased by 1
```

**5. Verify Other Passes Unchanged (Logical Test)**
```
GET /api/passes
Expected: Other passes (id != 1):
  - stock unchanged ✅

✅ VERIFY: Only purchased pass stock changed
```

---

## Scenario 4: Order Status Flow Verification

### Flow

**1. Buy Pass**
```
POST /api/passes/1/buy
Save: razorpay_order_id
```

**2. Check Order Status (Before Webhook)**
```
GET /api/orders
Expected: Order with:
  - razorpay_payment_id = {{razorpay_order_id}}
  - status = "pending" ✅
```

**3. Check Dashboard Status (Before Webhook)**
```
GET /api/dashboard
Expected: {
  "my_passes": [
    {
      "razorpay_payment_id": "{{razorpay_order_id}}",
      "status": "pending" ✅
    }
  ]
}
```

**4. Simulate Webhook**
```
POST /api/webhook/razorpay
```

**5. Verify Order Status Updated (Logical Test)**
```
GET /api/orders
Expected: Order with:
  - razorpay_payment_id = {{razorpay_order_id}}
  - status = "success" ✅ (changed!)

✅ VERIFY: Status changed from "pending" to "success"
```

**6. Verify Dashboard Status Updated (Logical Test)**
```
GET /api/dashboard
Expected: {
  "my_passes": [
    {
      "razorpay_payment_id": "{{razorpay_order_id}}",
      "status": "success" ✅ (updated!)
    }
  ]
}

✅ VERIFY: Status updated in dashboard too
```

---

## Scenario 5: Data Consistency Verification

### Flow

**1. Buy Pass**
```
POST /api/passes/1/buy
Save: razorpay_order_id, pass_id, pass_type, pass_price
```

**2. Get Orders - Verify Pass Data**
```
GET /api/orders
Expected: Order with:
  - passes.id = {{pass_id}} ✅
  - passes.type = {{pass_type}} ✅
  - passes.price = {{pass_price}} ✅
```

**3. Get Dashboard - Verify Same Pass Data**
```
GET /api/dashboard
Expected: {
  "my_passes": [
    {
      "passes": {
        "id": {{pass_id}} ✅ (matches)
        "type": "{{pass_type}}" ✅ (matches)
        "price": {{pass_price}} ✅ (matches)
      }
    }
  ]
}

✅ VERIFY: Pass data is identical in both endpoints
```

---

## Scenario 6: Profile Update Verification

### Flow

**1. Register User**
```
POST /api/register
Save: access_token
```

**2. Get Profile (Before Update)**
```
GET /api/profile
Save: original_name = response.name
```

**3. Update Profile**
```
PUT /api/profile
Body: { "name": "New Name" }
```

**4. Get Profile (After Update) - Logical Test**
```
GET /api/profile
Expected: {
  "name": "New Name" ✅ (changed!)
}

✅ VERIFY: Name updated
```

**5. Get Dashboard - Verify Profile Updated (Logical Test)**
```
GET /api/dashboard
Expected: {
  "profile": {
    "name": "New Name" ✅ (matches!)
  }
}

✅ VERIFY: Profile in dashboard matches updated profile
```

---

## Scenario 7: Pass Availability Check

### Flow

**1. Find Pass with Low Stock**
```
GET /api/passes
Find pass with stock = 1
Save: pass_id, initial_stock = 1
```

**2. Buy Pass**
```
POST /api/passes/{{pass_id}}/buy
```

**3. Simulate Webhook**
```
POST /api/webhook/razorpay
```

**4. Verify Stock is Zero (Logical Test)**
```
GET /api/passes
Expected: Pass with:
  - id = {{pass_id}}
  - stock = 0 ✅

✅ VERIFY: Stock is now 0
```

**5. Try to Buy Again (Should Handle Gracefully)**
```
POST /api/passes/{{pass_id}}/buy
Expected: 400 Bad Request or stock check fails

✅ VERIFY: Cannot buy pass with 0 stock
```

---

## Postman Test Scripts for Logical Verification

### Buy Pass - Test Script
```javascript
// Save order ID
var jsonData = pm.response.json();
pm.collectionVariables.set("razorpay_order_id", jsonData.razorpay_order.id);

// Verify pass matches
pm.test("Pass matches purchased pass", function () {
    pm.expect(jsonData.pass.id).to.eql(parseInt(pm.collectionVariables.get("pass_id")));
    pm.expect(jsonData.pass.type).to.eql(pm.collectionVariables.get("pass_type"));
});
```

### Get Orders - Test Script
```javascript
pm.test("Order contains purchased pass", function () {
    var jsonData = pm.response.json();
    var orderId = pm.collectionVariables.get("razorpay_order_id");
    var passId = parseInt(pm.collectionVariables.get("pass_id"));
    
    var order = jsonData.find(o => o.razorpay_payment_id === orderId);
    pm.expect(order).to.exist;
    pm.expect(order.passes.id).to.eql(passId);
    
    // Save order ID for later
    pm.collectionVariables.set("order_id", order.id);
});
```

### Get Dashboard - Test Script
```javascript
pm.test("Purchased pass appears in my_passes", function () {
    var jsonData = pm.response.json();
    var orderId = pm.collectionVariables.get("order_id");
    var passId = parseInt(pm.collectionVariables.get("pass_id"));
    
    var pass = jsonData.my_passes.find(p => p.id === orderId);
    pm.expect(pass).to.exist;
    pm.expect(pass.passes.id).to.eql(passId);
});
```

### After Webhook - Verify Status Updated
```javascript
pm.test("Order status is success after webhook", function () {
    // This test should be in Get Orders request after webhook
    var jsonData = pm.response.json();
    var orderId = pm.collectionVariables.get("order_id");
    
    var order = jsonData.find(o => o.id === orderId);
    pm.expect(order.status).to.eql("success");
});
```

---

## Quick Test Checklist

### Basic Flow
- [ ] Register → Get token
- [ ] Get passes → Select one
- [ ] Buy pass → Get Razorpay order
- [ ] Get orders → Verify order appears
- [ ] Get dashboard → Verify pass in my_passes

### Payment Flow
- [ ] Buy pass → Status = "pending"
- [ ] Simulate webhook → Payment confirmed
- [ ] Get orders → Status = "success"
- [ ] Get dashboard → Status = "success"
- [ ] Get passes → Stock decreased

### Data Consistency
- [ ] Buy pass → Note pass details
- [ ] Get orders → Verify pass details match
- [ ] Get dashboard → Verify pass details match
- [ ] All three should have identical pass data

### Multiple Purchases
- [ ] Buy pass 1 → Verify in orders
- [ ] Buy pass 2 → Verify in orders
- [ ] Get orders → Both appear
- [ ] Get dashboard → Both in my_passes

---

## Expected Response Examples

### Complete Order Object
```json
{
  "id": "uuid-here",
  "status": "pending",
  "created_at": "2026-02-07T04:00:00.000Z",
  "razorpay_payment_id": "order_ABC123",
  "passes": {
    "id": 1,
    "type": "Gold",
    "price": 5000
  }
}
```

### Complete Dashboard Object
```json
{
  "profile": {
    "id": "uuid-here",
    "name": "Test User",
    "email": "test@example.com"
  },
  "events": [
    {
      "id": 1,
      "name": "eSummit CGC Mohali",
      "start_date": "2026-02-11T04:30:00+00:00"
    }
  ],
  "my_passes": [
    {
      "id": "order-uuid",
      "status": "pending",
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

---

**Use these scenarios to test your complete API flow! 🚀**
