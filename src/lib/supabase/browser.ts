"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 浏览器端 Supabase client（anon key，会话写入 cookie，供 SSR 读取）。
 * 未配置时返回 null，登录 UI 据此显示「未配置」而不是崩。
 */
let client: SupabaseClient | null | undefined;

export function browserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createBrowserClient(url, key) : null;
  return client;
}
