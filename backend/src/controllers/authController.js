const { supabase, supabaseService } = require('../services/supabase');

// POST /register
// Behavior:
// - If user already exists with this email + password is correct → acts like login (no new signUp call).
// - Otherwise, uses admin API to create user (bypasses rate limits) then signs them in.
async function register(req, res, next) {
  try {
    const { email, password, name, phone, org, year } = req.body;

    // 1) Try login first – avoids repeated signUp and Supabase email rate limits
    const loginAttempt = await supabase.auth.signInWithPassword({ email, password });

    if (!loginAttempt.error && loginAttempt.data?.user) {
      const user = loginAttempt.data.user;
      return res.status(200).json({
        user: {
          id: user.id,
          email: user.email,
        },
        access_token: loginAttempt.data.session?.access_token || null,
        mode: 'login',
      });
    }

    // 2) If login fails, create user via admin API (bypasses rate limits)
    let user;
    if (supabaseService) {
      // Use admin API to create user - no rate limits
      const { data: adminUser, error: adminError } = await supabaseService.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email for dev
      });

      if (adminError || !adminUser?.user) {
        const err = new Error(adminError?.message || 'Failed to register user');
        err.status = 400;
        throw err;
      }

      user = adminUser.user;
    } else {
      // Fallback to regular signUp if service role not available
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError || !signUpData?.user) {
        if (signUpError?.message === 'email rate limit exceeded') {
          const err = new Error('Too many signup attempts, please try again later.');
          err.status = 429;
          throw err;
        }
        const err = new Error(signUpError?.message || 'Failed to register user');
        err.status = 400;
        throw err;
      }

      user = signUpData.user;
    }

    // 3) Sign in the newly created user to get session token
    const signInResult = await supabase.auth.signInWithPassword({ email, password });
    const accessToken = signInResult.data?.session?.access_token || null;

    // 4) Create profile row on first registration
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      name,
      email,
      phone,
      org,
      year,
    });

    if (profileError) {
      // If profile already exists (user was created before), that's okay
      if (!profileError.message?.includes('duplicate') && !profileError.code === '23505') {
        const err = new Error('Failed to create profile');
        err.status = 500;
        throw err;
      }
    }

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      access_token: accessToken,
      mode: 'register',
    });
  } catch (err) {
    next(err);
  }
}

// POST /login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      access_token: data.session?.access_token || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
};

