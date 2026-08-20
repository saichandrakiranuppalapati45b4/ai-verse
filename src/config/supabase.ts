import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing Supabase environment variables. Please check your environment configuration.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
