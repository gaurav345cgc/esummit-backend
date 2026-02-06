const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase URL or ANON key missing. Check your .env configuration.');
}

// Public client (uses anon key) – safe for most queries under RLS
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client (uses service role) – INTERNAL ONLY, for server-side ops like webhooks
let supabaseService = null;
if (supabaseServiceRoleKey) {
  supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

module.exports = {
  supabase,
  supabaseService,
};

