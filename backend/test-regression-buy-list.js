// Regression Test: Buy Pass → Verify Order → List Orders
// Tests: Register → Buy Pass → Check Order → List Orders (verify pass appears)
// Usage: node test-regression-buy-list.js [base_url]

const axios = require('axios');

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test user data
const TEST_USER = {
  email: `regression_${Date.now()}@example.com`,
  password: 'Test123!@#',
  name: 'Regression Test User',
  phone: '9876543210',
  org: 'CGC',
  year: 2026,
};

let accessToken = null;
let userId = null;
let purchasedPassId = null;
let purchasedPassType = null;
let razorpayOrderId = null;
let orderId = null;

// Colors for console
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
async function step1_Register() {
  log('STEP 1', 'Registering new user...');
  try {
    const response = await axios.post(`${API_BASE}/register`, TEST_USER);
    accessToken = response.data.access_token;
    userId = response.data.user?.id;
    
    if (accessToken && userId) {
      success(`User registered: ${TEST_USER.email}`);
      info(`User ID: ${userId}`);
      return true;
    }
    throw new Error('Registration failed - missing token or user ID');
  } catch (err) {
    error('Registration failed', err);
    return false;
  }
}

async function step2_GetAvailablePass() {
  log('STEP 2', 'Fetching available passes...');
  try {
    const response = await axios.get(`${API_BASE}/passes`);
    const passes = response.data;
    
    if (!Array.isArray(passes) || passes.length === 0) {
      throw new Error('No passes found');
    }
    
    // Find first pass with stock > 0
    const availablePass = passes.find((p) => p.stock > 0);
    
    if (!availablePass) {
      throw new Error('No passes with stock available');
    }
    
    purchasedPassId = availablePass.id;
    purchasedPassType = availablePass.type;
    
    success(`Selected pass: ${availablePass.type} (ID: ${availablePass.id}, Price: ₹${availablePass.price}, Stock: ${availablePass.stock})`);
    return { success: true, pass: availablePass };
  } catch (err) {
    error('Failed to get available pass', err);
    return { success: false };
  }
}

async function step3_BuyPass() {
  log('STEP 3', `Purchasing pass ID: ${purchasedPassId} (${purchasedPassType})...`);
  
  if (!purchasedPassId) {
    error('No pass selected');
    return false;
  }
  
  try {
    // Get pass details to get price
    const passesResponse = await axios.get(`${API_BASE}/passes`);
    const pass = passesResponse.data.find((p) => p.id === purchasedPassId);
    
    if (!pass) {
      throw new Error('Pass not found');
    }
    
    const response = await axios.post(
      `${API_BASE}/passes/${purchasedPassId}/buy`,
      {
        expected_amount: pass.price,
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
    throw new Error('Purchase failed - missing Razorpay order ID');
  } catch (err) {
    error('Failed to purchase pass', err);
    return false;
  }
}

async function step4_VerifyOrderCreated() {
  log('STEP 4', 'Verifying order was created in database...');
  
  // Wait a bit for DB to sync
  await sleep(1000);
  
  try {
    const response = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const orders = response.data;
    
    if (!Array.isArray(orders)) {
      throw new Error('Invalid orders response');
    }
    
    // Find order by razorpay_payment_id
    const createdOrder = orders.find((o) => o.razorpay_payment_id === razorpayOrderId);
    
    if (createdOrder) {
      orderId = createdOrder.id;
      success(`Order found in database: ${orderId}`);
      info(`Status: ${createdOrder.status}`);
      info(`Razorpay ID: ${createdOrder.razorpay_payment_id}`);
      
      // Verify order has pass information
      if (createdOrder.passes) {
        success(`Order contains pass: ${createdOrder.passes.type} (ID: ${createdOrder.passes.id})`);
        
        // Verify it's the correct pass
        if (createdOrder.passes.id === purchasedPassId && createdOrder.passes.type === purchasedPassType) {
          success('✅ Pass matches purchased pass!');
          return true;
        } else {
          error(`Pass mismatch! Expected: ${purchasedPassType} (${purchasedPassId}), Got: ${createdOrder.passes.type} (${createdOrder.passes.id})`);
          return false;
        }
      } else {
        error('Order does not contain pass information');
        return false;
      }
    } else {
      error('Order not found in orders list');
      log('', 'All orders:', orders);
      return false;
    }
  } catch (err) {
    error('Failed to verify order', err);
    return false;
  }
}

async function step5_ListOrders() {
  log('STEP 5', 'Listing all orders to verify pass appears...');
  
  try {
    const response = await axios.get(`${API_BASE}/orders`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const orders = response.data;
    
    if (!Array.isArray(orders)) {
      throw new Error('Invalid orders response');
    }
    
    success(`Found ${orders.length} order(s) in list`);
    
    // Find our order
    const ourOrder = orders.find((o) => o.id === orderId);
    
    if (ourOrder) {
      success('✅ Our order appears in the list!');
      info(`Order ID: ${ourOrder.id}`);
      info(`Status: ${ourOrder.status}`);
      info(`Pass: ${ourOrder.passes?.type || 'N/A'} (₹${ourOrder.passes?.price || 'N/A'})`);
      info(`Razorpay ID: ${ourOrder.razorpay_payment_id}`);
      
      // Verify pass details
      if (ourOrder.passes) {
        if (ourOrder.passes.id === purchasedPassId && ourOrder.passes.type === purchasedPassType) {
          success('✅ Pass details are correct in order list!');
          log('', 'Full order details:', ourOrder);
          return true;
        } else {
          error('Pass details mismatch in order list');
          return false;
        }
      } else {
        error('Order in list does not contain pass information');
        return false;
      }
    } else {
      error('Our order does not appear in the list');
      log('', 'All orders:', orders);
      return false;
    }
  } catch (err) {
    error('Failed to list orders', err);
    return false;
  }
}

async function step6_VerifyPassInDashboard() {
  log('STEP 6', 'Checking dashboard to verify pass appears...');
  
  try {
    const response = await axios.get(`${API_BASE}/dashboard`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    const dashboard = response.data;
    const myPasses = dashboard.my_passes || [];
    
    success(`Dashboard loaded. Found ${myPasses.length} pass(es) in my_passes`);
    
    // Find our order in dashboard
    const ourPass = myPasses.find((p) => p.id === orderId || p.razorpay_payment_id === razorpayOrderId);
    
    if (ourPass) {
      success('✅ Our pass appears in dashboard my_passes!');
      info(`Order ID: ${ourPass.id}`);
      info(`Status: ${ourPass.status}`);
      info(`Pass: ${ourPass.passes?.type || 'N/A'} (₹${ourPass.passes?.price || 'N/A'})`);
      
      // Verify pass details
      if (ourPass.passes) {
        if (ourPass.passes.id === purchasedPassId && ourPass.passes.type === purchasedPassType) {
          success('✅ Pass details are correct in dashboard!');
          return true;
        } else {
          error('Pass details mismatch in dashboard');
          return false;
        }
      } else {
        error('Dashboard pass does not contain pass information');
        return false;
      }
    } else {
      error('Our pass does not appear in dashboard my_passes');
      log('', 'All my_passes:', myPasses);
      return false;
    }
  } catch (err) {
    error('Failed to check dashboard', err);
    return false;
  }
}

// Main test flow
async function runRegressionTest() {
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.blue}🔄 Regression Test: Buy Pass → Verify → List${colors.reset}`);
  console.log(`   Server: ${BASE_URL}`);
  console.log('='.repeat(70) + '\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };
  
  const steps = [
    { name: 'Register User', fn: step1_Register },
    { name: 'Get Available Pass', fn: step2_GetAvailablePass },
    { name: 'Buy Pass', fn: step3_BuyPass },
    { name: 'Verify Order Created', fn: step4_VerifyOrderCreated },
    { name: 'List Orders', fn: step5_ListOrders },
    { name: 'Verify in Dashboard', fn: step6_VerifyPassInDashboard },
  ];
  
  let passInfo = null;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    results.total++;
    
    try {
      let result;
      
      if (step.name === 'Get Available Pass') {
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
  console.log('\n' + '='.repeat(70));
  console.log(`${colors.blue}📊 Regression Test Summary${colors.reset}`);
  console.log('='.repeat(70));
  console.log(`Total Steps: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`\n${colors.green}🎉 All regression tests passed!${colors.reset}`);
    console.log(`${colors.green}✅ Buy → Verify → List flow is working correctly!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}❌ Regression test failed${colors.reset}`);
    console.log(`${colors.red}❌ Buy → Verify → List flow has issues${colors.reset}\n`);
    process.exit(1);
  }
}

// Run test
runRegressionTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
