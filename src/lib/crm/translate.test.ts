import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pickTranslationProvider, translateInquiryMessage } from "@/src/lib/crm/translate";

describe("crm translate — provider selection", () => {
  it("picks deepseek first when configured", () => {
    expect(pickTranslationProvider({ DEEPSEEK_API_KEY: "x", KIMI_API_KEY: "z" })).toBe("deepseek");
  });

  it("falls back to kimi when deepseek is absent", () => {
    expect(pickTranslationProvider({ KIMI_API_KEY: "z" })).toBe("kimi");
  });

  it("ignores openrouter and returns null when nothing else is configured", () => {
    expect(pickTranslationProvider({ OPENROUTER_API_KEY: "y" })).toBeNull();
    expect(pickTranslationProvider({})).toBeNull();
  });
});

describe("crm translate — unconfigured behavior", () => {
  const saved = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    service: process.env.SUPABASE_SERVICE_ROLE_KEY,
    key: process.env.SUPABASE_KEY,
  };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_KEY;
  });

  afterEach(() => {
    if (saved.url) process.env.NEXT_PUBLIC_SUPABASE_URL = saved.url;
    if (saved.service) process.env.SUPABASE_SERVICE_ROLE_KEY = saved.service;
    if (saved.key) process.env.SUPABASE_KEY = saved.key;
  });

  it("fails explicitly instead of throwing when Supabase is unconfigured", async () => {
    const result = await translateInquiryMessage({
      messageId: "m1",
      viewerProfileId: "p1",
      targetLang: "es",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });
});
