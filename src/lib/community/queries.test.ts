import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPost,
  getPublishedPost,
  listPublishedPosts,
  slugifyTitle,
} from "@/src/lib/community/queries";

/**
 * 过渡期契约：Supabase 未配置时查询层优雅降级（不抛错），
 * 让 SSR 页与构建在没有数据库时仍可渲染空状态。
 */
describe("community queries — unconfigured graceful degradation", () => {
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

  it("listPublishedPosts returns an empty page instead of throwing", async () => {
    const result = await listPublishedPosts();
    expect(result).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("listPublishedPosts clamps page/perPage bounds", async () => {
    const result = await listPublishedPosts({ page: 0, perPage: 999 });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(50);
  });

  it("getPublishedPost returns null instead of throwing", async () => {
    const post = await getPublishedPost({ slug: "whatever" });
    expect(post).toBeNull();
  });

  it("createPost returns a not_configured error instead of throwing", async () => {
    const result = await createPost({
      authorProfileId: "profile-id",
      lang: "es",
      title: "Mi publicación",
      bodyMd: "Contenido",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });
});

describe("slugifyTitle", () => {
  it("normalizes an ordinary English title", () => {
    expect(slugifyTitle("Hello World")).toMatch(/^hello-world-[0-9a-f]{6}$/);
  });

  it("folds symbol runs into one separator", () => {
    expect(slugifyTitle("Hello, World! -- 2026")).toMatch(
      /^hello-world-2026-[0-9a-f]{6}$/
    );
  });

  it("falls back to post for a non-ASCII title", () => {
    expect(slugifyTitle("中国供应链观察")).toMatch(/^post-[0-9a-f]{6}$/);
  });

  it("truncates the normalized title to 80 characters", () => {
    expect(slugifyTitle("a".repeat(100))).toMatch(
      new RegExp(`^a{80}-[0-9a-f]{6}$`)
    );
  });
});
