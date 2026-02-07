# Pass Upgrade Feature Guide

## Pass Pricing Hierarchy

Passes are now ordered by value (highest to lowest):

1. **Priority** - ₹15,000 (Highest tier)
2. **Platinum** - ₹10,000
3. **Gold** - ₹5,000
4. **Silver** - ₹3,000 (Lowest tier)

---

## Upgrade Logic

Users can upgrade from a lower-tier pass to a higher-tier pass by paying the **price difference**.

### Example Scenarios:

**Scenario 1: Silver → Gold**
- Current pass: Silver (₹3,000)
- Upgrade to: Gold (₹5,000)
- **Upgrade price: ₹2,000** (₹5,000 - ₹3,000)

**Scenario 2: Gold → Platinum**
- Current pass: Gold (₹5,000)
- Upgrade to: Platinum (₹10,000)
- **Upgrade price: ₹5,000** (₹10,000 - ₹5,000)

**Scenario 3: Gold → Priority**
- Current pass: Gold (₹5,000)
- Upgrade to: Priority (₹15,000)
- **Upgrade price: ₹10,000** (₹15,000 - ₹5,000)

**Scenario 4: Platinum → Priority**
- Current pass: Platinum (₹10,000)
- Upgrade to: Priority (₹15,000)
- **Upgrade price: ₹5,000** (₹15,000 - ₹10,000)

---

## API Endpoint

### Upgrade Pass

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

**Parameters**:
- `:id` - ID of the pass to upgrade TO (must be higher tier)
- `expected_amount` - The upgrade price (difference between new and current pass)
- `version` - Optional, for optimistic locking

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

---

## Upgrade Flow

### Step-by-Step Process:

1. **User has a successful pass** (status = "success")
   - Example: Silver pass (₹3,000)

2. **User wants to upgrade to Gold** (₹5,000)

3. **Calculate upgrade price**:
   - Upgrade price = ₹5,000 - ₹3,000 = ₹2,000

4. **User calls upgrade endpoint**:
   ```
   POST /api/passes/1/upgrade
   Body: { "expected_amount": 2000 }
   ```

5. **System validates**:
   - ✅ User has existing successful pass
   - ✅ New pass is higher tier
   - ✅ Expected amount matches upgrade price
   - ✅ New pass has stock available

6. **Create Razorpay order** for upgrade amount (₹2,000)

7. **Create order record** with status "pending"

8. **After payment webhook**:
   - Order status → "success"
   - User now has both passes (old and new)
   - Or old pass can be marked as "upgraded" (future enhancement)

---

## Validation Rules

### ✅ Valid Upgrades:
- Silver → Gold
- Silver → Platinum
- Silver → Priority
- Gold → Platinum
- Gold → Priority
- Platinum → Priority

### ❌ Invalid Upgrades:
- Same tier (e.g., Gold → Gold)
- Lower tier (e.g., Gold → Silver)
- No existing pass (must purchase first)
- Existing pass not successful (must be "success" status)

---

## Error Responses

### No Existing Pass
```json
{
  "error": "No existing pass found. Please purchase a pass first before upgrading.",
  "status": 400
}
```

### Invalid Upgrade (Same or Lower Tier)
```json
{
  "error": "Cannot upgrade to Gold (₹5000). You already have Gold (₹5000) or a higher tier pass.",
  "status": 400
}
```

### Wrong Amount
```json
{
  "error": "Expected amount (1000) does not match upgrade price (2000). You need to pay ₹2000 to upgrade from Silver to Gold.",
  "status": 400
}
```

### New Pass Out of Stock
```json
{
  "error": "New pass is out of stock",
  "status": 400
}
```

---

## Postman Test Flow

### 1. Purchase Initial Pass
```
POST /api/passes/2/buy  (Silver - ₹3,000)
Body: { "expected_amount": 3000, "version": 0 }
→ Save: razorpay_order_id_1
```

### 2. Simulate Payment Webhook
```
POST /api/webhook/razorpay
Body: { "event": "payment.captured", ... }
→ Order status becomes "success"
```

### 3. Upgrade to Gold
```
POST /api/passes/1/upgrade  (Gold - ₹5,000)
Body: { "expected_amount": 2000, "version": 0 }
→ Upgrade price: ₹2,000 (₹5,000 - ₹3,000)
→ Save: razorpay_order_id_2
```

### 4. Verify Upgrade Order
```
GET /api/orders
→ Should show 2 orders:
  - Order 1: Silver (status: "success")
  - Order 2: Gold (status: "pending")
```

### 5. Simulate Upgrade Payment Webhook
```
POST /api/webhook/razorpay
Body: { "event": "payment.captured", ... }
→ Order 2 status becomes "success"
```

### 6. Verify Both Passes
```
GET /api/dashboard
→ my_passes should contain both:
  - Silver pass (₹3,000)
  - Gold pass (₹5,000)
```

---

## Database Considerations

### Current Implementation:
- Creates a new order for the upgrade
- User will have multiple orders (old + new)
- Both passes appear in `my_passes`

### Future Enhancements (Optional):
- Add `upgraded_from_order_id` field to track upgrade chain
- Mark old order as "upgraded" status
- Show only highest tier pass in dashboard (or show upgrade history)

---

## Testing Checklist

- [ ] User with Silver pass can upgrade to Gold
- [ ] User with Gold pass can upgrade to Platinum
- [ ] User with Platinum pass can upgrade to Priority
- [ ] Cannot upgrade to same tier
- [ ] Cannot upgrade to lower tier
- [ ] Upgrade price calculation is correct
- [ ] Wrong amount is rejected
- [ ] No existing pass is rejected
- [ ] Out of stock pass is rejected
- [ ] Upgrade order appears in orders list
- [ ] Upgrade pass appears in dashboard after payment

---

## Example: Complete Upgrade Journey

1. **Purchase Silver** (₹3,000)
   - Order created: `order_1`
   - Status: "pending" → "success" (after webhook)

2. **Upgrade to Gold** (Pay ₹2,000 difference)
   - Order created: `order_2`
   - Status: "pending" → "success" (after webhook)
   - User now has: Silver + Gold

3. **Upgrade to Priority** (Pay ₹10,000 difference from Gold)
   - Order created: `order_3`
   - Status: "pending" → "success" (after webhook)
   - User now has: Silver + Gold + Priority

**Total paid**: ₹3,000 + ₹2,000 + ₹10,000 = ₹15,000 (same as buying Priority directly)

---

**Note**: Users can upgrade multiple times, accumulating passes. The system tracks all successful orders.
