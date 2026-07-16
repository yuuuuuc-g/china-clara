import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { serviceClient } from "@/src/lib/supabase/service";

/**
 * Personal Access Token 鉴权（外部项目接入：博客、个人电商站、AI 代理…）。
 * Token 形如 pat_xxx，库中只存 SHA-256 哈希（crm.api_tokens）。
 */

export const SCOPES = [
  "content:read",
  "catalog:read",
  "catalog:write",
  "inquiries:read",
  "inquiries:write",
] as const;
export type Scope = (typeof SCOPES)[number];

export interface AuthResult {
  ok: boolean;
  tokenId?: string;
  scopes?: Scope[];
  reason?: string;
}

export async function authenticatePat(
  req: NextRequest,
  requiredScope: Scope
): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token.startsWith("pat_")) {
    return { ok: false, reason: "missing_or_malformed_token" };
  }

  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await serviceClient()
    .schema("crm")
    .from("api_tokens")
    .select("id, scopes, revoked_at, expires_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: "token_not_found" };
  if (data.revoked_at) return { ok: false, reason: "token_revoked" };
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { ok: false, reason: "token_expired" };
  }
  const scopes = (data.scopes ?? []) as Scope[];
  if (!scopes.includes(requiredScope)) {
    return { ok: false, reason: "insufficient_scope" };
  }
  return { ok: true, tokenId: data.id as string, scopes };
}
