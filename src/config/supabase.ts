import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://glwwaoqbnguvorophdle.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsd3dhb3Fibmd1dm9yb3BoZGxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTY2OTYsImV4cCI6MjEwMjYzMjY5Nn0.P8oG1R9kUrDORU0k2AFK6TbLnOtqGngiZcwlu4XflgU";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing Supabase environment variables. Please check .env file.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
