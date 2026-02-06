const { supabase } = require('../services/supabaseClient');

// GET /profile
async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      const err = new Error('Failed to fetch profile');
      err.status = 500;
      throw err;
    }

    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// PUT /profile
async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates })
      .select('*')
      .single();

    if (error) {
      const err = new Error('Failed to update profile');
      err.status = 500;
      throw err;
    }

    return res.json({ updated: data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
};

