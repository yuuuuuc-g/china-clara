import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { translateMissingArticles } from "@/src/lib/content/translate-articles";

/** 未配置时显式失败（不静默、不抛错），与其他管线约定一致。 */
describe("translate-articles — unconfigured behavior", () => {
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

  it("fails explicitly with supabase_not_configured instead of throwing", async () => {
    const summary = await translateMissingArticles();
    expect(summary.ok).toBe(false);
    expect(summary.reason).toBe("supabase_not_configured");
    expect(summary.results).toEqual([]);
  });
});
