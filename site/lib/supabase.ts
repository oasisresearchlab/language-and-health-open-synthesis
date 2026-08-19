import { createBrowserClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";

// Session-aware browser client. Reads the auth cookie and attaches the user's
// JWT to every request (so tightened RLS passes once logged in). Optional: if
// env vars are absent (a plain clone / the test env) the review UI falls back
// to local behavior.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createBrowserClient(url, key) : null;

export const supabaseConfigured = supabase !== null;
