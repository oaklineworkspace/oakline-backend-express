import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration.');
  throw new Error('SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL are required.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
