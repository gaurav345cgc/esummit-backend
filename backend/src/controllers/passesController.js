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
    const { data, error } = await publicSupabase.from('passes').select('*').order('price', { ascending: true });

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

module.exports = {
  listPasses,
  buyPass,
};

