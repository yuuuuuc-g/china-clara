import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listPublishedArticles, getPublishedArticle } from "@/src/lib/content/queries";

/**
 * 过渡期契约：Supabase 未配置时查询层优雅降级（不抛错），
 * 让 SSR 页与构建在没有数据库时仍可渲染空状态。
 */
describe("content queries — unconfigured graceful degradation", () => {
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

  it("listPublishedArticles returns an empty page instead of throwing", async () => {
    const result = await listPublishedArticles({ lang: "es" });
    expect(result).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("listPublishedArticles clamps page/perPage bounds", async () => {
    const result = await listPublishedArticles({ lang: "en", page: 0, perPage: 999 });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(50);
  });

  it("getPublishedArticle returns null instead of throwing", async () => {
    const article = await getPublishedArticle({ lang: "zh", slug: "whatever" });
    expect(article).toBeNull();
  });
});
