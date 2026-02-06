// Load env first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

(async () => {
  try {
    const { data, error } = await supabase.from('events').select('id, name').limit(1);

    if (error) {
      console.error('Supabase error:', error);
    } else {
      console.log('Connection OK. Sample data:', data);
    }
  } catch (e) {
    console.error('Unexpected error:', e);
  }
})();