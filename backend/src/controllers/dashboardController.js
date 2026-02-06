const { supabase } = require('../services/supabaseClient');

// GET /dashboard
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const eventsPromise = supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    const ordersPromise = supabase
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

    const [{ data: profile, error: profileError }, { data: events, error: eventsError }, { data: orders, error: ordersError }] =
      await Promise.all([profilePromise, eventsPromise, ordersPromise]);

    if (profileError || eventsError || ordersError) {
      const err = new Error('Failed to fetch dashboard data');
      err.status = 500;
      throw err;
    }

    const activeEvents = events || [];
    const mainEvent = activeEvents[0] || null;

    let countdownMs = null;
    if (mainEvent?.start_date) {
      const now = new Date();
      const startDate = new Date(mainEvent.start_date);
      countdownMs = Math.max(0, startDate.getTime() - now.getTime());
    }

    return res.json({
      profile,
      events: activeEvents,
      my_passes: orders || [],
      countdown_ms: countdownMs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
};

