import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASIC_REALM = "Secure Area";

function isExemptPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/textures/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/api/cron")) return true;
  return false;
}

function decodeBasicPassword(authorization: string): string | null {
  if (!authorization.startsWith("Basic ")) {
    return null;
  }
  try {
    const encoded = authorization.slice("Basic ".length);
    const decoded = atob(encoded);
    const colonIndex = decoded.indexOf(":");
    if (colonIndex === -1) {
      return decoded;
    }
    return decoded.slice(colonIndex + 1);
  } catch {
    return null;
  }
}

function isAuthorized(request: NextRequest): boolean {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return process.env.NODE_ENV === "development";
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const password = decodeBasicPassword(authorization);
  return password === sitePassword;
}

export function middleware(request: NextRequest) {
  if (isExemptPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (isAuthorized(request)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${BASIC_REALM}"`,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|textures/|api/cron/).*)",
  ],
};
