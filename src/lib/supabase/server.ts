import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 终端用户会话 client（anon key + cookie 会话）。RSC / server actions / 路由处理器可用。
 * 与 service.ts 的区别：这里代表「当前登录用户」，受 RLS 约束；service 是后端全权。
 * 未配置时返回 null（构建与无库环境优雅降级）。
 */
export async function sessionClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // RSC 渲染期间不允许写 cookie：刷新后的 token 由后续客户端交互落盘。
        }
      },
    },
  });
}
