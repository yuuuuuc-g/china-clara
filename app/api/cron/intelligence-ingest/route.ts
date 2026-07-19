/**
 * 中拉贸易情报抓取 cron（整文件重写，替换 legacy knowledge-galaxy 实现）
 *
 * 用途：由定时任务（如 Vercel Cron）周期性调用 GET，执行 ingestLatamSources()，
 * 将 config/intelligence-sources-latam.json 中登记的中拉贸易 RSS 源抓取进
 * content 域的 intelligence_sources / source_articles 两张表。
 *
 * 鉴权方式：
 * - 配置了 CRON_SECRET 时，要求请求头 `Authorization: Bearer <CRON_SECRET>`，否则 401；
 * - 未配置 CRON_SECRET 时，仅非生产环境放行（便于本地联调）。
 * Supabase 未配置时返回 503，避免被误报为抓取成功。
 */

import { NextResponse } from "next/server";
import { ingestLatamSources } from "@/src/lib/content/intel-ingest";
import { getOptionalEnv } from "@/src/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** 校验 cron 调用方身份：生产环境必须携带 CRON_SECRET */
function isAuthorized(request: Request): boolean {
  const secret = getOptionalEnv("CRON_SECRET");
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await ingestLatamSources();
  if (!summary.ok) {
    // Supabase 未配置：视为服务不可用，而非抓取失败
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json(summary);
}
