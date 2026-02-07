# Load Testing Guide - PowerShell

## Quick Start (PowerShell)

### Step 1: Install Artillery
```powershell
npm install -g artillery
```

### Step 2: Set Environment Variable (PowerShell Syntax)
```powershell
# PowerShell syntax (NOT export)
$env:TEST_TOKEN = "your_jwt_token_here"

# Verify it's set
echo $env:TEST_TOKEN
```

### Step 3: Get a Test Token

**Option A: Use existing token**
```powershell
# If you already have a token from login/register
$env:TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Option B: Get new token via API**
```powershell
# Register/Login to get token
curl -X POST http://localhost:3000/api/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"loadtest@example.com\",\"password\":\"test123\",\"name\":\"Load Test\",\"phone\":\"9999999999\",\"org\":\"CGC\",\"year\":2026}'

# Copy the access_token from response, then:
$env:TEST_TOKEN = "paste_token_here"
```

### Step 4: Run Load Test

**For Local Server:**
```powershell
# Update artillery-test.yml target to: http://localhost:3000
artillery run artillery-test.yml
```

**For Production (Vercel):**
```powershell
# artillery-test.yml already points to production
artillery run artillery-test.yml
```

### Step 5: Review Results

Artillery will show:
- Total requests
- Response times (p50, p95, p99)
- Success rate
- Errors (if any)

**Expected Results:**
- ✅ No 5xx errors
- ✅ Average response time < 200ms
- ✅ Success rate > 99%

---

## PowerShell Environment Variable Cheat Sheet

```powershell
# Set variable (current session only)
$env:TEST_TOKEN = "your_token"

# Set variable (persistent for current PowerShell window)
[Environment]::SetEnvironmentVariable("TEST_TOKEN", "your_token", "Process")

# Check if set
echo $env:TEST_TOKEN

# Clear variable
Remove-Item Env:\TEST_TOKEN
```

---

## Alternative: Edit artillery-test.yml Directly

Instead of using environment variables, you can hardcode the token:

**Edit `artillery-test.yml`:**
```yaml
scenarios:
  - name: "Dashboard Load Test"
    flow:
      - get:
          url: "/api/dashboard"
          headers:
            Authorization: "Bearer YOUR_TOKEN_HERE"  # Paste token here
```

Then run:
```powershell
artillery run artillery-test.yml
```

---

## Troubleshooting

### Issue: "TEST_TOKEN not set"
**Fix**: Use PowerShell syntax: `$env:TEST_TOKEN = "value"`

### Issue: "401 Unauthorized"
**Fix**: Token expired or invalid. Get a new token from `/api/login`

### Issue: "Connection refused"
**Fix**: Make sure server is running (local) or deployed (production)

### Issue: Artillery not found
**Fix**: Install globally: `npm install -g artillery`

---

## Quick Test Command

```powershell
# One-liner (replace YOUR_TOKEN)
$env:TEST_TOKEN = "YOUR_TOKEN"; artillery run artillery-test.yml
```
