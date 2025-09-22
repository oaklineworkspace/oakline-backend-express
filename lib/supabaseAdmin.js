
import { createClient } from '@supabase/supabase-js'

// This key should only be used on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.error('Please check your environment variables in the Secrets tab');
  throw new Error('SUPABASE_SERVICE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for server-side operations.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
