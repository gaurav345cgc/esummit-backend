const crypto = require('crypto');
const { supabaseService } = require('../services/supabase');

// POST /api/webhook/razorpay
// Handles Razorpay webhook events (can be called directly or proxied from Edge Function)
async function razorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    console.log('[Webhook] Received request');
    console.log('[Webhook] Has signature:', !!signature);
    console.log('[Webhook] Has secret:', !!webhookSecret);

    if (!signature || !webhookSecret) {
      console.error('[Webhook] Missing signature or secret');
      const err = new Error('Missing webhook signature or secret');
      err.status = 401;
      throw err;
    }

    // Get raw body for signature verification (express.raw gives us Buffer)
    const body = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Webhook] Invalid signature');
      console.error('[Webhook] Expected:', expectedSignature.substring(0, 20) + '...');
      console.error('[Webhook] Received:', signature.substring(0, 20) + '...');
      const err = new Error('Invalid webhook signature');
      err.status = 401;
      throw err;
    }

    console.log('[Webhook] Signature verified');

    // Parse body
    const payload = JSON.parse(body);
    const { event, payload: paymentPayload } = payload;

    // Only process payment.captured events
    if (event !== 'payment.captured') {
      return res.json({ ok: true, message: 'Event ignored' });
    }

    const paymentId = paymentPayload?.payment?.entity?.id;
    const orderId = paymentPayload?.payment?.entity?.order_id;

    console.log('[Webhook] Payment ID:', paymentId);
    console.log('[Webhook] Order ID:', orderId);

    if (!paymentId || !orderId) {
      console.error('[Webhook] Missing payment or order ID');
      const err = new Error('Missing payment or order ID');
      err.status = 400;
      throw err;
    }

    if (!supabaseService) {
      const err = new Error('Supabase service role not configured');
      err.status = 500;
      throw err;
    }

    // Find order by razorpay_payment_id
    const { data: orderData, error: orderFindError } = await supabaseService
      .from('orders')
      .select('id, pass_id, status')
      .eq('razorpay_payment_id', orderId)
      .single();

    if (orderFindError || !orderData) {
      console.error('[Webhook] Order not found:', orderFindError);
      console.error('[Webhook] Searched for order_id:', orderId);
      const err = new Error(`Order not found: ${orderFindError?.message || 'No order with this razorpay_payment_id'}`);
      err.status = 404;
      throw err;
    }

    console.log('[Webhook] Order found:', orderData.id, 'Status:', orderData.status);

    // Skip if already processed
    if (orderData.status === 'success') {
      return res.json({ ok: true, message: 'Already processed' });
    }

    const passId = orderData.pass_id;

    // Try RPC function first
    console.log('[Webhook] Calling RPC confirm_payment');
    const { error: rpcError } = await supabaseService.rpc('confirm_payment', {
      order_id_param: orderData.id,
      payment_id_param: paymentId,
      pass_id_param: passId,
    });

    if (rpcError) {
      // Fallback: direct updates if RPC doesn't exist
      console.warn('[Webhook] RPC confirm_payment not found, using direct updates:', rpcError.message);

      // Update order status
      const { error: orderUpdateError } = await supabaseService
        .from('orders')
        .update({ status: 'success', razorpay_payment_id: paymentId })
        .eq('id', orderData.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      // Get current pass stock
      const { data: passData, error: passFetchError } = await supabaseService
        .from('passes')
        .select('stock, row_version')
        .eq('id', passId)
        .single();

      if (passFetchError) {
        throw passFetchError;
      }

      // Decrement stock and increment row_version
      await supabaseService
        .from('passes')
        .update({
          stock: Math.max(0, (passData.stock || 0) - 1),
          row_version: (passData.row_version || 0) + 1,
        })
        .eq('id', passId);
    }

    // Emit realtime event (if Socket.io is available)
    if (req.app && req.app.get('io')) {
      const io = req.app.get('io');
      // Get user_id from order (would need to fetch it)
      const { data: orderWithUser } = await supabaseService
        .from('orders')
        .select('user_id')
        .eq('id', orderData.id)
        .single();

      if (orderWithUser?.user_id) {
        io.to(`user:${orderWithUser.user_id}`).emit('order_update', {
          order_id: orderData.id,
          status: 'success',
          pass_id: passId,
        });
      }
    }

    console.log('[Webhook] Payment confirmed successfully');
    return res.json({
      ok: true,
      message: 'Payment confirmed',
      order_id: orderData.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  razorpayWebhook,
};
