import { createClient } from "@supabase/supabase-js";

// Frontend-safe client only. Uses the public anon/publishable key, which is
// meant to be visible in the browser — Row Level Security policies (added in
// supabase/migrations/0001_init_schema.sql) are what actually keep data safe,
// not secrecy of this key. NEVER put the service-role key behind VITE_ or
// reference it from this file — that key bypasses Row Level Security entirely
// and must only ever be used server-side (future import scripts).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Temporary read-only connection check — fetches the skin_types lookup table
// seeded by supabase/migrations/0002_seed_lookups.sql. Used by
// src/pages/SupabaseTestPage.jsx to verify the frontend can reach Supabase.
export async function fetchSkinTypes() {
  if (!supabase) {
    return {
      data: null,
      error: new Error(
        "Supabase is not configured — missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY."
      ),
    };
  }
  return supabase.from("skin_types").select("*").order("label");
}
