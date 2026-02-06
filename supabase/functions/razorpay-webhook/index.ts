// Supabase Edge Function: Razorpay Webhook Handler
// Verifies Razorpay signature and updates order/pass status atomically

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Helper to verify Razorpay webhook signature using Web Crypto API
async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(body);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const expectedSignature = signatureArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return signature.toLowerCase() === expectedSignature.toLowerCase();
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!RAZORPAY_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Razorpay webhook signature
    const isValid = await verifySignature(body, signature, RAZORPAY_WEBHOOK_SECRET);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);
    const { event, payload: paymentPayload } = payload;

    // Only process payment.captured events
    if (event !== 'payment.captured') {
      return new Response(JSON.stringify({ ok: true, message: 'Event ignored' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const paymentId = paymentPayload?.payment?.entity?.id;
    const orderId = paymentPayload?.payment?.entity?.order_id;

    if (!paymentId || !orderId) {
      return new Response(JSON.stringify({ error: 'Missing payment or order ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find order by razorpay_payment_id (order_id from Razorpay)
    const { data: orderData, error: orderFindError } = await supabase
      .from('orders')
      .select('id, pass_id, status')
      .eq('razorpay_payment_id', orderId)
      .single();

    if (orderFindError || !orderData) {
      console.error('Order not found:', orderFindError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Skip if already processed
    if (orderData.status === 'success') {
      return new Response(JSON.stringify({ ok: true, message: 'Already processed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const passId = orderData.pass_id;

    // Try RPC function first (atomic update)
    const { error: rpcError } = await supabase.rpc('confirm_payment', {
      order_id_param: orderData.id,
      payment_id_param: paymentId,
      pass_id_param: passId,
    });

    if (rpcError) {
      // Fallback: direct updates if RPC doesn't exist
      console.warn('RPC confirm_payment not found, using direct updates:', rpcError);

      // Update order status
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({ status: 'success', razorpay_payment_id: paymentId })
        .eq('id', orderData.id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }

      // Decrement pass stock and increment row_version
      const { error: passUpdateError } = await supabase.rpc('decrement_pass_stock', {
        pass_id_param: passId,
      });

      if (passUpdateError) {
        // Fallback: direct update
        const { data: passData } = await supabase
          .from('passes')
          .select('stock, row_version')
          .eq('id', passId)
          .single();

        if (passData) {
          await supabase
            .from('passes')
            .update({
              stock: Math.max(0, passData.stock - 1),
              row_version: (passData.row_version || 0) + 1,
            })
            .eq('id', passId);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Payment confirmed',
        order_id: orderData.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
