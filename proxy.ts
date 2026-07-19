import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase 会话续期：access token（1 小时）过期后，用 refresh token 换新并写回
 * cookie，避免登录用户闲置一小时后 SSR 页面把人当未登录（询盘中心/社区发帖都依赖）。
 * 无 sb- cookie 的匿名流量直接放行，不产生 Auth 服务请求。
 */
async function withRefreshedSession(req: NextRequest): Promise<NextResponse> {
  let res = NextResponse.next({ request: req });
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !key) return res;
  if (!req.cookies.getAll().some((c) => c.name.startsWith('sb-'))) return res;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // getUser() 内部完成过期检测与 refresh；结果本身在这里不重要。
  // 携带已作废 refresh token 的请求（如登出后残留 cookie）刷新必然失败，属预期，静默即可。
  await supabase.auth.getUser().catch(() => undefined);
  return res;
}

/**
 * Constant-time string comparison, safe for the Edge runtime.
 *
 * We SHA-256 both inputs to fixed-length digests first so the byte-by-byte
 * loop never short-circuits on length, then diff the digests without early
 * return. This avoids leaking the password via response timing.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [digestA, digestB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);

  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

// 🚀 核心修正：函数名从 middleware 改为了 proxy
export async function proxy(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  // 使用方括号语法，强制运行时读取，防止 Webpack 静态替换
  const expectedPassword = process.env['SITE_PASSWORD'];

  if (!expectedPassword) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("⚠️ [Auth Proxy]: SITE_PASSWORD is not set. Bypassing authentication in development.");
      return withRefreshedSession(req);
    }

    console.error("🚨 [Auth Proxy]: SITE_PASSWORD is not set in production. Blocking request.");
    return new NextResponse('Authentication is not configured', { status: 500 });
  }

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      const decodedValue = atob(authValue);
      const separatorIndex = decodedValue.indexOf(':');

      if (separatorIndex !== -1) {
        const user = decodedValue.substring(0, separatorIndex);
        const pwd = decodedValue.substring(separatorIndex + 1);

        if (user === 'admin' && (await timingSafeEqual(pwd, expectedPassword))) {
          return withRefreshedSession(req);
        }
      }
    } catch {
      // 解析异常静默处理，直接放行至下方的 401 拦截
    }
  }

  // 校验失败，返回标准的 401 拦截头
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ['/((?!api/cron|_next/static|_next/image|favicon.ico|textures).*)'],
};
