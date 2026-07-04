import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/src/lib/database.types";
import { getSupabaseAdminEnv } from "@/src/lib/env";

export function createSupabaseAdmin() {
  const env = getSupabaseAdminEnv();

  return createClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
