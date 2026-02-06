const { supabase } = require('../services/supabaseClient');

// GET /orders
async function listOrders(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        id,
        status,
        created_at,
        razorpay_payment_id,
        passes:pass_id (
          id,
          type,
          price
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      const err = new Error('Failed to fetch orders');
      err.status = 500;
      throw err;
    }

    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listOrders,
};

