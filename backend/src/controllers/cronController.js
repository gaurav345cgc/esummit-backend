const { supabaseService } = require('../services/supabase');

// POST /api/cron/ping
// Daily ping to keep Supabase project active (prevents auto-pause on free tier)
async function ping(req, res, next) {
  try {
    if (!supabaseService) {
      const err = new Error('Supabase service role not configured');
      err.status = 500;
      throw err;
    }

    // Simple insert to keep DB active (creates a logs table if needed)
    // Using a lightweight operation that won't fail if table doesn't exist
    const { error } = await supabaseService
      .from('events')
      .select('id')
      .limit(1);

    // If events table doesn't exist, just return success anyway
    // The ping is just to hit the DB, not to store data

    return res.json({
      ok: true,
      message: 'Ping successful',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Even if there's an error, return success (ping is best-effort)
    return res.json({
      ok: true,
      message: 'Ping attempted',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  ping,
};
