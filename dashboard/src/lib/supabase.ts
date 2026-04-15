import { createClient } from '@supabase/supabase-js';

// Server-side only — never expose service key to the browser
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  return createClient(url, key);
}
