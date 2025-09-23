// lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Load Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment variables');
}

if (!supabaseAnonKey) {
  console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY missing. Front-end client may not work in production.');
}

if (!supabaseServiceKey) {
  console.warn('⚠️ SUPABASE_SERVICE_KEY missing. Server-side admin client will not work.');
}

// ------------------------
// Front-end client (browser) - singleton
// ------------------------
let supabaseInstance = null;

export const supabase = (() => {
  if (typeof window !== 'undefined') {
    if (!supabaseInstance) {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ Supabase front-end client not initialized due to missing URL or anon key');
        return null;
      }
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storage: window.localStorage,
          detectSessionInUrl: true,
          autoRefreshToken: true,
          storageKey: 'oakline-auth-session',
          flowType: 'pkce',
          sessionTimeoutMinutes: 15,
        },
        realtime: {
          params: { eventsPerSecond: 10 },
        },
      });
    }
    return supabaseInstance;
  }
  return null; // server-side: don't use this client
})();

// ------------------------
// Server-side admin client (elevated privileges)
// ------------------------
export const supabaseAdmin = (() => {
  if (!supabaseServiceKey) {
    console.warn('⚠️ Supabase admin client not initialized. Missing SUPABASE_SERVICE_KEY.');
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false, // server-side doesn't need session persistence
    },
  });
})();
