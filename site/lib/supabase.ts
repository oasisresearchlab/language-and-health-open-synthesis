import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Central review store for the accuracy pass. Optional: if the env vars are absent
// (e.g. a plain clone), the review UI falls back to localStorage so the UX still works.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const supabaseConfigured = supabase !== null;
