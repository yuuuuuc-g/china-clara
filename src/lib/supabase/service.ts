import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * China Clara 四域 service client（untyped，待 supabase:types 重新生成后再类型化）。
 * 仅在 /api/v1 网关层使用。用法：serviceClient().schema("content").from("articles")
 * 旧 knowledge-galaxy 客户端在 ./admin.ts，逐步迁移后删除。
 */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
