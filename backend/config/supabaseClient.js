
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase URL or Anon Key in .env');
    process.exit(1);
}

// Initialize the Supabase client with the Anon key for standard operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Initialize the Supabase Admin client with Service Role key (for backend-only tasks)
let supabaseAdmin = null;
if (supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
} else {
    console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY not found. Admin operations may fail.');
}

module.exports = { supabase, supabaseAdmin };
