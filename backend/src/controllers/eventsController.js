const { supabase } = require('../services/supabaseClient');

// GET /events
async function listEvents(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: true });

    if (error) {
      const err = new Error('Failed to fetch events');
      err.status = 500;
      throw err;
    }

    return res.json(data || []);
  } catch (err) {
    next(err);
  }
}

// GET /events/:id
async function getEvent(req, res, next) {
  try {
    const id = Number(req.params.id);

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !event) {
      const err = new Error('Event not found');
      err.status = 404;
      throw err;
    }

    const now = new Date();
    const startDate = event.start_date ? new Date(event.start_date) : null;
    const countdownMs =
      startDate && !Number.isNaN(startDate.getTime())
        ? Math.max(0, startDate.getTime() - now.getTime())
        : null;

    return res.json({
      event,
      countdown_ms: countdownMs,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listEvents,
  getEvent,
};

