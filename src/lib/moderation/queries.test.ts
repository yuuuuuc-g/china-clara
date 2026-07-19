import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  approvePost,
  approveSupplier,
  listPendingPosts,
  listPendingSuppliers,
  rejectPost,
  rejectSupplier,
} from "@/src/lib/moderation/queries";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_KEY",
] as const;

describe("moderation.queries（未配置 Supabase 时优雅降级）", () => {
  const savedEnv: Partial<
    Record<(typeof ENV_KEYS)[number], string | undefined>
  > = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = savedEnv[key];
      if (value !== undefined) {
        process.env[key] = value;
      }
    }
  });

  it("listPendingPosts 未配置时返回 []", async () => {
    await expect(listPendingPosts()).resolves.toEqual([]);
  });

  it("listPendingSuppliers 未配置时返回 []", async () => {
    await expect(listPendingSuppliers()).resolves.toEqual([]);
  });

  it("approvePost 未配置时返回 ok:false 且 code 为 not_configured", async () => {
    const result = await approvePost({
      postId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
      expect(result.message).toBe("Supabase is not configured");
    }
  });

  it("rejectPost 未配置时返回 ok:false 且 code 为 not_configured", async () => {
    const result = await rejectPost({
      postId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
    }
  });

  it("approveSupplier 未配置时返回 ok:false 且 code 为 not_configured", async () => {
    const result = await approveSupplier({
      supplierId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
    }
  });

  it("rejectSupplier 未配置时返回 ok:false 且 code 为 not_configured", async () => {
    const result = await rejectSupplier({
      supplierId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_configured");
    }
  });
});
