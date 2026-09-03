import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;
const supabaseServiceRoleKey = env.supabase.serviceRoleKey;

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

export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'supabase.admin.auth.token'
      },
    })
  : null;
