const { createClient } = require('@supabase/supabase-js');
const { razorpay } = require('../services/razorpay');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

// Helper to get Supabase client with user's JWT token
function getSupabaseClient(userToken) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    },
  });
}

// GET /passes
async function listPasses(req, res, next) {
  try {
    const { supabase: publicSupabase } = require('../services/supabaseClient');
    // Order by price descending (highest first: Priority > Platinum > Gold > Silver)
    const { data, error } = await publicSupabase.from('passes').select('*').order('price', { ascending: false });

    if (error) {
      const err = new Error('Failed to fetch passes');
      err.status = 500;
      throw err;
    }

    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// POST /passes/:id/buy
async function buyPass(req, res, next) {
  try {
    const userId = req.user.id;
    const passId = Number(req.params.id);
    const { expected_amount, version } = req.body;

    // Get user's JWT token from Authorization header for RLS
    const authHeader = req.headers.authorization || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) {
      const err = new Error('Missing authorization token');
      err.status = 401;
      throw err;
    }

    // Create Supabase client with user's JWT token (required for RLS on orders table)
    const userSupabase = getSupabaseClient(userToken);

    // 1. Check if Razorpay is configured
    if (!razorpay) {
      const err = new Error('Razorpay not configured. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
      err.status = 500;
      throw err;
    }

    // 2. Verify pass exists and get current stock (public read, no auth needed)
    const { supabase: publicSupabase } = require('../services/supabaseClient');
    const { data: passData, error: passError } = await publicSupabase
      .from('passes')
      .select('id, type, price, stock')
      .eq('id', passId)
      .single();

    if (passError || !passData) {
      const err = new Error('Pass not found');
      err.status = 404;
      throw err;
    }

    if (passData.stock <= 0) {
      const err = new Error('Pass out of stock');
      err.status = 400;
      throw err;
    }

    // 3. Verify expected amount matches pass price
    if (expected_amount !== passData.price) {
      const err = new Error(`Expected amount (${expected_amount}) does not match pass price (${passData.price})`);
      err.status = 400;
      throw err;
    }

    // 4. Optionally verify stock via RPC if implemented (skip if RPC doesn't exist)
    if (version !== undefined) {
      const { error: rpcError } = await userSupabase.rpc('check_stock', {
        pass_id: passId,
        version,
      });
      // Ignore RPC errors if function doesn't exist yet
      if (rpcError && !rpcError.message?.includes('function') && !rpcError.message?.includes('does not exist')) {
        const err = new Error('Stock check failed');
        err.status = 400;
        throw err;
      }
    }

    // 5. Create Razorpay order
    const amountPaise = expected_amount * 100;

    // Receipt must be <= 40 chars (Razorpay limit)
    // Format: u{userId_short}_p{passId}_{timestamp_short}
    const userIdShort = userId.substring(0, 8); // First 8 chars of UUID
    const timestampShort = Date.now().toString().slice(-8); // Last 8 digits
    const receipt = `u${userIdShort}_p${passId}_${timestampShort}`; // Max ~30 chars

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receipt,
      });
    } catch (razorpayError) {
      // Handle Razorpay API errors
      if (razorpayError.statusCode === 401) {
        const err = new Error('Razorpay authentication failed. Check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
        err.status = 500;
        throw err;
      }
      const err = new Error(razorpayError.error?.description || 'Failed to create Razorpay order');
      err.status = razorpayError.statusCode || 500;
      throw err;
    }

    // 6. Insert order row with pending status (use user's Supabase client for RLS)
    const { error: orderError } = await userSupabase.from('orders').insert({
      user_id: userId,
      pass_id: passId,
      razorpay_payment_id: razorpayOrder.id,
      status: 'pending',
    });

    if (orderError) {
      // Log the actual error for debugging
      console.error('Order insert error:', orderError);
      const err = new Error(`Failed to create order: ${orderError.message || 'Unknown error'}`);
      err.status = 500;
      throw err;
    }

    // Return response with pass details and amount in INR (not paise)
    return res.status(201).json({
      razorpay_order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount, // Amount in paise (for Razorpay)
        amount_inr: expected_amount, // Amount in INR (for frontend clarity)
        currency: razorpayOrder.currency,
      },
      pass: {
        id: passData.id,
        type: passData.type,
        price: passData.price, // Price in INR
      },
      order_status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}

// Pass tier hierarchy (price order)
const PASS_TIERS = {
  'Silver': 1,    // Lowest tier
  'Gold': 2,
  'Platinum': 3,
  'Priority': 4,  // Highest tier
};

// Get tier number for a pass type
function getPassTier(passType) {
  return PASS_TIERS[passType] || 0;
}

// POST /passes/:id/upgrade
async function upgradePass(req, res, next) {
  try {
    const userId = req.user.id;
    const newPassId = Number(req.params.id);
    const { expected_amount, version } = req.body;

    // Get user's JWT token from Authorization header for RLS
    const authHeader = req.headers.authorization || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) {
      const err = new Error('Missing authorization token');
      err.status = 401;
      throw err;
    }

    // Create Supabase client with user's JWT token
    const userSupabase = getSupabaseClient(userToken);
    const { supabase: publicSupabase, supabaseService } = require('../services/supabaseClient');

    // 1. Check if Razorpay is configured
    if (!razorpay) {
      const err = new Error('Razorpay not configured. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
      err.status = 500;
      throw err;
    }

    // 2. Get new pass details
    const { data: newPassData, error: newPassError } = await publicSupabase
      .from('passes')
      .select('id, type, price, stock')
      .eq('id', newPassId)
      .single();

    if (newPassError || !newPassData) {
      const err = new Error('New pass not found');
      err.status = 404;
      throw err;
    }

    if (newPassData.stock <= 0) {
      const err = new Error('New pass is out of stock');
      err.status = 400;
      throw err;
    }

    // 3. Get user's existing successful orders (only success status)
    const { data: existingOrders, error: ordersError } = await userSupabase
      .from('orders')
      .select(`
        id,
        pass_id,
        status,
        passes:pass_id (
          id,
          type,
          price
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'success')
      .order('created_at', { ascending: false });

    if (ordersError) {
      const err = new Error('Failed to fetch existing orders');
      err.status = 500;
      throw err;
    }

    if (!existingOrders || existingOrders.length === 0) {
      const err = new Error('No existing pass found. Please purchase a pass first before upgrading.');
      err.status = 400;
      throw err;
    }

    // 4. Get the highest tier pass the user currently owns
    let currentPass = null;
    let highestTier = 0;

    for (const order of existingOrders) {
      if (order.passes && order.passes.type) {
        const tier = getPassTier(order.passes.type);
        if (tier > highestTier) {
          highestTier = tier;
          currentPass = order.passes;
        }
      }
    }

    if (!currentPass) {
      const err = new Error('Could not determine current pass tier');
      err.status = 400;
      throw err;
    }

    // 5. Verify upgrade is valid (new pass must be higher tier)
    const currentTier = getPassTier(currentPass.type);
    const newTier = getPassTier(newPassData.type);

    if (newTier <= currentTier) {
      const err = new Error(`Cannot upgrade to ${newPassData.type} (₹${newPassData.price}). You already have ${currentPass.type} (₹${currentPass.price}) or a higher tier pass.`);
      err.status = 400;
      throw err;
    }

    // 6. Calculate upgrade price (difference between new and current pass)
    const upgradePrice = newPassData.price - currentPass.price;

    if (upgradePrice <= 0) {
      const err = new Error('Upgrade price calculation error');
      err.status = 500;
      throw err;
    }

    // 7. Verify expected amount matches upgrade price
    if (expected_amount !== upgradePrice) {
      const err = new Error(`Expected amount (${expected_amount}) does not match upgrade price (${upgradePrice}). You need to pay ₹${upgradePrice} to upgrade from ${currentPass.type} to ${newPassData.type}.`);
      err.status = 400;
      throw err;
    }

    // 8. Create Razorpay order for upgrade amount
    const amountPaise = upgradePrice * 100;
    const userIdShort = userId.substring(0, 8);
    const timestampShort = Date.now().toString().slice(-8);
    const receipt = `u${userIdShort}_up${newPassId}_${timestampShort}`; // "up" for upgrade

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: receipt,
        notes: {
          type: 'upgrade',
          from_pass: currentPass.type,
          to_pass: newPassData.type,
          from_pass_id: currentPass.id,
          to_pass_id: newPassId,
        },
      });
    } catch (razorpayError) {
      if (razorpayError.statusCode === 401) {
        const err = new Error('Razorpay authentication failed. Check your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
        err.status = 500;
        throw err;
      }
      const err = new Error(razorpayError.error?.description || 'Failed to create Razorpay order');
      err.status = razorpayError.statusCode || 500;
      throw err;
    }

    // 9. Insert upgrade order with special status
    const { error: orderError } = await userSupabase.from('orders').insert({
      user_id: userId,
      pass_id: newPassId,
      razorpay_payment_id: razorpayOrder.id,
      status: 'pending',
      // Store upgrade info in notes or use a separate field if available
      // For now, we'll use the notes field in Razorpay order
    });

    if (orderError) {
      console.error('Upgrade order insert error:', orderError);
      const err = new Error(`Failed to create upgrade order: ${orderError.message || 'Unknown error'}`);
      err.status = 500;
      throw err;
    }

    // Return response with upgrade details
    return res.status(201).json({
      razorpay_order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount, // Amount in paise
        amount_inr: upgradePrice, // Upgrade price in INR
        currency: razorpayOrder.currency,
      },
      upgrade_details: {
        from_pass: {
          id: currentPass.id,
          type: currentPass.type,
          price: currentPass.price,
        },
        to_pass: {
          id: newPassData.id,
          type: newPassData.type,
          price: newPassData.price,
        },
        upgrade_price: upgradePrice,
      },
      order_status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPasses,
  buyPass,
  upgradePass,
};

