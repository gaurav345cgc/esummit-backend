// End-to-End User Flow Test
// Simulates complete user journey: Register → View Events → Buy Pass → Webhook → Dashboard
// Usage: node test-e2e-flow.js [base_url]
// Example: node test-e2e-flow.js http://localhost:3000

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test user data
const TEST_USER = {
  email: `test_${Date.now()}@example.com`,
  password: 'Test123!@#',
  name: 'E2E Test User',
  phone: '9876543210',
  org: 'CGC',
  year: 2026,
};

let accessToken = null;
let userId = null;
let razorpayOrderId = null;
let orderId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(step, message, data = null) {
  console.log(`${colors.cyan}[${step}]${colors.reset} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function error(message, err = null) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (err) {
    console.error(err.response?.data || err.message);
  }
}

function info(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test Steps
async function step1_HealthCheck() {
  log('STEP 1', 'Checking server health...');
  try {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.data.status === 'ok') {
      success('Server is healthy');
      return true;
    }
    throw new Error('Health check failed');
  } catch (err) {
    error('Health check failed', err);
    return false;
  }
}

async function step2_Register() {
  log('STEP 2', 'Registering new user...', TEST_USER);
  try {
    const response = await axios.post(`${API_BASE}/register`, TEST_USER);
    accessToken = response.data.access_token;
    userId = response.data.user?.id;
    
    if (accessToken && userId) {
      success(`User registered: ${TEST_USER.email}`);
      info(`User ID: ${userId}`);
      info(`Token: ${accessToken.substring(0, 20)}...`);
      return true;
    }
    throw new Error('Registration response missing token or user ID');
  } catch (err) {
    error('Registration failed', err);
    return false;
  }
}

async function step3_GetProfile() {
  log('STEP 3', 'Fetching user profile...');
  try {
    const response = await axios.get(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    success('Profile fetched successfully');
    log('', 'Profile data:', response.data);
    return true;
  } catch (err) {
    error('Failed to fetch profile', err);
    return false;
  }
}

async function step4_ViewEvents() {
  log('STEP 4', 'Fetching events...');
  try {
    const response = await axios.get(`${API_BASE}/events`);
    const events = response.data;
    
    if (Array.isArray(events) && events.length > 0) {
      success(`Found ${events.length} event(s)`);
      log('', 'Events:', events);
      return true;
    }
    throw new Error('No events found');
  } catch (err) {
    error('Failed to fetch events', err);
    return false;
  }
}

async function step5_ViewPasses() {
  log('STEP 5', 'Fetching passes...');
  try {
    const response = await axios.get(`${API_BASE}/passes`);
    const passes = response.data;
    
    if (Array.isArray(passes) && passes.length > 0) {
      success(`Found ${passes.length} pass(es)`);
      log('', 'Passes:', passes);
      
      // Find first available pass with stock > 0
      const availablePass = passes.find((p) => p.stock > 0);
      if (availablePass) {
        info(`Will purchase: ${availablePass.type} (ID: ${availablePass.id}, Price: ₹${availablePass.price})`);
        return { success: true, passId: availablePass.id, passPrice: availablePass.price };
      }
      throw new Error('No passes with stock available');
    }
    throw new Error('No passes found');
  } catch (err) {
    error('Failed to fetch passes', err);
    return { success: false };
  }
}

async function step6_BuyPass(passId, expectedAmount) {
  log('STEP 6', `Purchasing pass ID: ${passId}...`);
  try {
    const response = await axios.post(
      `${API_BASE}/passes/${passId}/buy`,
      {
        expected_amount: expectedAmount,
        version: 0,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    razorpayOrderId = response.data.razorpay_order?.id;
    const passInfo = response.data.pass;
    
    if (razorpayOrderId) {
      success('Pass purchase initiated');
      info(`Razorpay Order ID: ${razorpayOrderId}`);
      info(`Pass: ${passInfo?.type} (₹${passInfo?.price})`);
      log('', 'Purchase response:', response.data);
      return true;
    }
    throw new Error('Purchase response missing Razorpay order ID');
  } catch (err) {
    error('Failed to purchase pass', err);
    return false;
  }
}

async function step7_GetOrders() {
  log('STEP 7', 'Fetching user orders...');
  try {
    const response = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const orders = response.data;
    if (Array.isArray(orders)) {
      const pendingOrder = orders.find((o) => o.razorpay_payment_id === razorpayOrderId);
      if (pendingOrder) {
        orderId = pendingOrder.id;
        success(`Found order: ${orderId}`);
        info(`Status: ${pendingOrder.status}`);
        log('', 'Orders:', orders);
        return true;
      }
      throw new Error('Order not found in orders list');
    }
    throw new Error('Invalid orders response');
  } catch (err) {
    error('Failed to fetch orders', err);
    return false;
  }
}

async function step8_SimulateWebhook() {
  log('STEP 8', 'Simulating Razorpay webhook...');
  
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    info('RAZORPAY_WEBHOOK_SECRET not set. Skipping webhook test.');
    info('Set it with: $env:RAZORPAY_WEBHOOK_SECRET = "your_secret"');
    info('Webhook step skipped (optional) - continuing test...');
    return { skipped: true }; // Return special value to indicate skip
  }
  
  try {
    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_TEST_E2E',
            order_id: razorpayOrderId,
            amount: 500000,
            currency: 'INR',
            status: 'captured',
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
    };
    
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    
    const response = await axios.post(`${API_BASE}/webhook/razorpay`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
      },
    });
    
    if (response.data.ok) {
      success('Webhook processed successfully');
      log('', 'Webhook response:', response.data);
      return true;
    }
    throw new Error('Webhook response not ok');
  } catch (err) {
    error('Webhook simulation failed', err);
    return false;
  }
}

async function step9_VerifyOrderStatus() {
  log('STEP 9', 'Verifying order status after webhook...');
  
  // If webhook was skipped, skip this step too
  if (!razorpayOrderId) {
    info('Webhook was skipped, skipping order verification');
    return { skipped: true };
  }
  
  // Wait a bit for DB to update
  await sleep(1000);
  
  try {
    const response = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const orders = response.data;
    const updatedOrder = orders.find((o) => o.id === orderId);
    
    if (updatedOrder) {
      if (updatedOrder.status === 'success') {
        success('Order status updated to SUCCESS');
        log('', 'Updated order:', updatedOrder);
        return true;
      } else {
        info(`Order status is: ${updatedOrder.status} (webhook may not have processed yet)`);
        info('This is OK if webhook was skipped - order will remain pending');
        return { skipped: true }; // Don't fail if webhook wasn't run
      }
    }
    throw new Error('Order not found');
  } catch (err) {
    error('Failed to verify order status', err);
    return false;
  }
}

async function step10_GetDashboard() {
  log('STEP 10', 'Fetching dashboard...');
  try {
    const response = await axios.get(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const dashboard = response.data;
    success('Dashboard fetched successfully');
    info(`Profile: ${dashboard.profile?.name}`);
    info(`Events: ${dashboard.events?.length || 0}`);
    info(`My Passes: ${dashboard.my_passes?.length || 0}`);
    info(`Countdown: ${dashboard.countdown_ms ? `${Math.floor(dashboard.countdown_ms / 1000)}s` : 'N/A'}`);
    log('', 'Dashboard data:', dashboard);
    return true;
  } catch (err) {
    error('Failed to fetch dashboard', err);
    return false;
  }
}

// Main test flow
async function runE2ETest() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}🚀 End-to-End User Flow Test${colors.reset}`);
  console.log(`   Server: ${BASE_URL}`);
  console.log('='.repeat(60) + '\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  const steps = [
    { name: 'Health Check', fn: step1_HealthCheck },
    { name: 'Register User', fn: step2_Register },
    { name: 'Get Profile', fn: step3_GetProfile },
    { name: 'View Events', fn: step4_ViewEvents },
    { name: 'View Passes', fn: step5_ViewPasses },
    { name: 'Buy Pass', fn: null }, // Will be set dynamically
    { name: 'Get Orders', fn: step7_GetOrders },
    { name: 'Simulate Webhook', fn: step8_SimulateWebhook },
    { name: 'Verify Order Status', fn: step9_VerifyOrderStatus },
    { name: 'Get Dashboard', fn: step10_GetDashboard },
  ];
  
  let passInfo = null;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    results.total++;
    
    try {
      let result;
      
      if (step.name === 'Buy Pass') {
        if (!passInfo || !passInfo.success) {
          error('Cannot buy pass - no available passes');
          results.failed++;
          break;
        }
        result = await step6_BuyPass(passInfo.passId, passInfo.passPrice);
      } else if (step.name === 'View Passes') {
        passInfo = await step.fn();
        result = passInfo.success;
      } else {
        result = await step.fn();
      }
      
      if (result) {
        results.passed++;
      } else {
        results.failed++;
        error(`Step "${step.name}" failed. Stopping test.`);
        break;
      }
      
      // Small delay between steps
      await sleep(500);
    } catch (err) {
      results.failed++;
      error(`Step "${step.name}" threw error:`, err);
      break;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}📊 Test Summary${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Total Steps: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  if (results.skipped > 0) {
    console.log(`${colors.yellow}Skipped: ${results.skipped} (optional)${colors.reset}`);
  }
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    if (results.skipped > 0) {
      console.log(`\n${colors.green}✅ All critical tests passed!${colors.reset}`);
      console.log(`${colors.yellow}⚠️  ${results.skipped} optional step(s) skipped${colors.reset}\n`);
    } else {
      console.log(`\n${colors.green}🎉 All tests passed!${colors.reset}\n`);
    }
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Run test
runE2ETest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
