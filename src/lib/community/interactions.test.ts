import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listComments,
  getPostEngagement,
  addComment,
  toggleLike,
} from "@/src/lib/community/interactions";

/** 未配置时：读优雅降级，写显式失败（与全站查询层约定一致）。 */
describe("community interactions — unconfigured behavior", () => {
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

  it("listComments returns [] instead of throwing", async () => {
    await expect(listComments("p1")).resolves.toEqual([]);
  });

  it("getPostEngagement returns zero state instead of throwing", async () => {
    await expect(getPostEngagement({ postId: "p1", viewerProfileId: "u1" })).resolves.toEqual({
      likeCount: 0,
      likedByViewer: false,
    });
  });

  it("addComment fails explicitly with not_configured", async () => {
    const result = await addComment({ postId: "p1", authorProfileId: "u1", body: "hola" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });

  it("toggleLike fails explicitly with not_configured", async () => {
    const result = await toggleLike({ postId: "p1", profileId: "u1" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });
});
