import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/** GET /api/v1/openapi — 返回 OpenAPI 契约（YAML） */
export async function GET() {
  const spec = await readFile(path.join(process.cwd(), "openapi.yaml"), "utf8");
  return new NextResponse(spec, {
    headers: { "content-type": "application/yaml; charset=utf-8" },
  });
}
