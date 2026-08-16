import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createSupabaseBrowserClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase configuration is missing. Copy .env.example to .env.local.");
  }

  return createClient(url, anonKey);
}
