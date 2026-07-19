import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  listInquiriesForBuyer,
  listInquiriesForSupplier,
  hasOwnedSuppliers,
  getInquiryForParty,
  createInquiry,
  addInquiryMessage,
} from "@/src/lib/crm/inquiries";

/**
 * 过渡期契约：Supabase 未配置时——
 * 读操作优雅降级（空列表 / null），SSR 页与构建仍可渲染；
 * 写操作显式失败（ok:false, not_configured），不静默吞错。
 */
describe("crm inquiries — unconfigured behavior", () => {
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

  it("listInquiriesForBuyer returns an empty page instead of throwing", async () => {
    const result = await listInquiriesForBuyer({ buyerProfileId: "p1", lang: "es" });
    expect(result).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("listInquiriesForBuyer clamps page/perPage bounds", async () => {
    const result = await listInquiriesForBuyer({
      buyerProfileId: "p1",
      lang: "en",
      page: 0,
      perPage: 999,
    });
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(50);
  });

  it("listInquiriesForSupplier returns an empty page instead of throwing", async () => {
    const result = await listInquiriesForSupplier({
      supplierOwnerProfileId: "p1",
      lang: "es",
    });
    expect(result).toEqual({ items: [], total: 0, page: 1, perPage: 20 });
  });

  it("hasOwnedSuppliers returns false instead of throwing", async () => {
    await expect(hasOwnedSuppliers("p1")).resolves.toBe(false);
  });

  it("getInquiryForParty returns null instead of throwing", async () => {
    const detail = await getInquiryForParty({ id: "i1", viewerProfileId: "p1", lang: "zh" });
    expect(detail).toBeNull();
  });

  it("createInquiry fails explicitly when unconfigured", async () => {
    const result = await createInquiry({
      buyerProfileId: "p1",
      productId: "prod1",
      quantity: 100,
      message: "Hola, quisiera una cotización.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });

  it("addInquiryMessage fails explicitly when unconfigured", async () => {
    const result = await addInquiryMessage({
      inquiryId: "i1",
      senderProfileId: "p1",
      body: "¿Alguna novedad?",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("not_configured");
  });
});
