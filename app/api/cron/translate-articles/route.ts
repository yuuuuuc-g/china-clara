/**
 * 文章 AI 翻译 cron：把已发布、有中文源文但缺西/英译文的文章批量初翻，
 * 写入 content.article_translations（human_reviewed=false，待人工校订）。
 * 鉴权与 intelligence-ingest 同约定：生产环境必须携带 CRON_SECRET Bearer。
 */

import { NextResponse } from "next/server";
import { translateMissingArticles } from "@/src/lib/content/translate-articles";
import { getOptionalEnv } from "@/src/lib/env";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

  const summary = await translateMissingArticles();
  if (!summary.ok) {
    return NextResponse.json({ error: summary.reason ?? "not configured" }, { status: 503 });
  }
  return NextResponse.json(summary);
}
