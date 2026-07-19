import { sessionClient } from "@/src/lib/supabase/server";
import { serviceClient } from "@/src/lib/supabase/service";

/**
 * 会话 → crm.profiles 的桥。SSR 页与 server actions 用它拿「我是谁」。
 * profile 缺失时兜底补建（正常由迁移 0008 的 auth.users 触发器创建，双保险）。
 */

export interface SessionProfile {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: "user" | "supplier" | "editor" | "admin";
  preferredLang: string;
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const client = await sessionClient();
  if (!client) return null;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const metaName =
    (typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name) ||
    null;
  const fallback: SessionProfile = {
    userId: user.id,
    email: user.email ?? null,
    displayName: metaName,
    role: "user",
    preferredLang: "es",
  };

  try {
    const service = serviceClient();
    const { data: profile, error } = await service
      .schema("crm")
      .from("profiles")
      .select("id, role, display_name, preferred_lang")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[auth.session] profile fetch failed:", error.message);
      return fallback;
    }
    if (profile) {
      return {
        userId: user.id,
        email: user.email ?? null,
        displayName: (profile.display_name as string | null) ?? metaName,
        role: profile.role as SessionProfile["role"],
        preferredLang: (profile.preferred_lang as string) ?? "es",
      };
    }

    const preferredLang =
      (typeof user.user_metadata?.preferred_lang === "string" &&
        user.user_metadata.preferred_lang) ||
      "es";
    const { error: insertError } = await service.schema("crm").from("profiles").insert({
      id: user.id,
      display_name: metaName,
      preferred_lang: preferredLang,
    });
    if (insertError) {
      console.error("[auth.session] profile backfill failed:", insertError.message);
    }
    return { ...fallback, preferredLang };
  } catch (err) {
    console.error("[auth.session] service client unavailable:", err);
    return fallback;
  }
}
