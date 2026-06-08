import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 🚀 核心修正：函数名从 middleware 改为了 proxy
export function proxy(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  // 使用方括号语法，强制运行时读取，防止 Webpack 静态替换
  const expectedPassword = process.env['SITE_PASSWORD'];

  // 如果云端确实没有配置环境变量，仅在后台静默警告，防止业务死锁
  if (!expectedPassword) {
    console.warn("⚠️ [Auth Proxy]: SITE_PASSWORD is not set. Bypassing authentication.");
    return NextResponse.next();
  }

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1];
      const decodedValue = atob(authValue);
      const separatorIndex = decodedValue.indexOf(':');

      if (separatorIndex !== -1) {
        const user = decodedValue.substring(0, separatorIndex);
        const pwd = decodedValue.substring(separatorIndex + 1);

        if (user === 'admin' && pwd === expectedPassword) {
          return NextResponse.next();
        }
      }
    } catch (error) {
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
