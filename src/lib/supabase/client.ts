import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/src/lib/env";

export function createClient() {
  const env = getPublicSupabaseEnv();

  return createBrowserClient(
    env.supabaseUrl,
    env.supabaseAnonKey
  );
}
