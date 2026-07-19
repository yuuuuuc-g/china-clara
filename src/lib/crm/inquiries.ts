import { serviceClient } from "@/src/lib/supabase/service";
import type { Locale } from "@/src/i18n/config";

/**
 * crm 域「询盘中心」查询层。/api/v1 路由、server actions 与 SSR 页共用（API-first）。
 * 铁律 #3：没有订单，只有询盘与消息。
 *
 * 访问控制：本层用 service client（绕过 RLS），因此每个函数都显式校验
 * 「当事人」身份（买家本人，或商品所属供应商的 owner）。调用方只需传入
 * 已认证的 profileId，不要在本层之外再拼访问条件。
 *
 * 读操作在 Supabase 未配置或出错时优雅降级（空列表 / null）；
 * 写操作返回判别结果 { ok: false, code } 而不是静默吞错。
 */

export type InquiryStatus = "open" | "replied" | "negotiating" | "closed" | "archived";

export const INQUIRY_STATUSES: readonly InquiryStatus[] = [
  "open",
  "replied",
  "negotiating",
  "closed",
  "archived",
];

export interface InquiryProductRef {
  id: string;
  slug: string;
  name: string;
  supplierSlug: string | null;
  supplierName: string | null;
}

export interface InquiryListItem {
  id: string;
  status: InquiryStatus;
  quantity: number;
  targetPort: string | null;
  createdAt: string;
  updatedAt: string;
  product: InquiryProductRef | null;
}

export interface InquiryMessage {
  id: string;
  senderProfileId: string;
  body: string;
  createdAt: string;
}

export interface InquiryDetail extends InquiryListItem {
  buyerProfileId: string;
  /** 当前查看者视角：buyer（买家）或 supplier（供应商 owner）。 */
  viewerRole: "buyer" | "supplier";
  messages: InquiryMessage[];
}

export type WriteResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string; message: string };

interface RawInquiry {
  id: string;
  product_id: string;
  buyer_profile_id: string;
  quantity: number;
  target_port: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

interface RawProductJoin {
  id: string;
  slug: string;
  supplier: {
    slug: string;
    company_name: string;
    company_name_en: string | null;
    owner_profile_id: string | null;
  } | null;
  translations: { lang: string; name: string }[];
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

function pickName(translations: { lang: string; name: string }[], lang: Locale): string {
  const byLang = new Map(translations.map((t) => [t.lang, t.name]));
  return byLang.get(lang) ?? byLang.get("zh") ?? translations[0]?.name ?? "";
}

function supplierName(
  s: { company_name: string; company_name_en: string | null } | null,
  lang: Locale
): string | null {
  if (!s) return null;
  if (lang === "zh") return s.company_name;
  return s.company_name_en || s.company_name;
}

const PRODUCT_JOIN_SELECT =
  "id, slug, supplier:supplier_id (slug, company_name, company_name_en, owner_profile_id), translations:product_translations (lang, name)";

/** 批量取商品（含供应商与三语名），返回 product_id → join 行。 */
async function fetchProducts(ids: string[]): Promise<Map<string, RawProductJoin>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await serviceClient()
    .schema("catalog")
    .from("products")
    .select(PRODUCT_JOIN_SELECT)
    .in("id", ids);
  if (error) {
    console.error("[crm.inquiries] fetchProducts failed:", error.message);
    return new Map();
  }
  const rows = (data ?? []) as unknown as RawProductJoin[];
  return new Map(rows.map((r) => [r.id, r]));
}

function toProductRef(join: RawProductJoin | undefined, lang: Locale): InquiryProductRef | null {
  if (!join) return null;
  return {
    id: join.id,
    slug: join.slug,
    name: pickName(join.translations ?? [], lang),
    supplierSlug: join.supplier?.slug ?? null,
    supplierName: supplierName(join.supplier, lang),
  };
}

export async function listInquiriesForBuyer(opts: {
  buyerProfileId: string;
  lang: Locale;
  page?: number;
  perPage?: number;
}): Promise<{ items: InquiryListItem[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(50, Math.max(1, opts.perPage ?? 20));
  if (!isConfigured()) return { items: [], total: 0, page, perPage };

  const { data, error, count } = await serviceClient()
    .schema("crm")
    .from("inquiries")
    .select("id, product_id, buyer_profile_id, quantity, target_port, status, created_at, updated_at", {
      count: "exact",
    })
    .eq("buyer_profile_id", opts.buyerProfileId)
    .order("updated_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) {
    console.error("[crm.inquiries] listInquiriesForBuyer failed:", error.message);
    return { items: [], total: 0, page, perPage };
  }
  const rows = (data ?? []) as unknown as RawInquiry[];
  const products = await fetchProducts([...new Set(rows.map((r) => r.product_id))]);

  const items: InquiryListItem[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    quantity: r.quantity,
    targetPort: r.target_port,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    product: toProductRef(products.get(r.product_id), opts.lang),
  }));
  return { items, total: count ?? items.length, page, perPage };
}

/**
 * 询盘详情（含消息线程）。仅当 viewer 是买家本人或商品所属供应商 owner 时返回，
 * 否则一律 null（不区分「不存在」与「无权」，避免探测）。
 */
export async function getInquiryForParty(opts: {
  id: string;
  viewerProfileId: string;
  lang: Locale;
}): Promise<InquiryDetail | null> {
  if (!isConfigured()) return null;
  const client = serviceClient();

  const { data, error } = await client
    .schema("crm")
    .from("inquiries")
    .select("id, product_id, buyer_profile_id, quantity, target_port, status, created_at, updated_at")
    .eq("id", opts.id)
    .maybeSingle();

  if (error) {
    console.error("[crm.inquiries] getInquiryForParty failed:", error.message);
    return null;
  }
  if (!data) return null;
  const inquiry = data as unknown as RawInquiry;

  const products = await fetchProducts([inquiry.product_id]);
  const join = products.get(inquiry.product_id);

  const isBuyer = inquiry.buyer_profile_id === opts.viewerProfileId;
  const isSupplierOwner = join?.supplier?.owner_profile_id === opts.viewerProfileId;
  if (!isBuyer && !isSupplierOwner) return null;

  const { data: messageRows, error: messagesError } = await client
    .schema("crm")
    .from("inquiry_messages")
    .select("id, sender_profile_id, body, created_at")
    .eq("inquiry_id", inquiry.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[crm.inquiries] messages fetch failed:", messagesError.message);
  }

  return {
    id: inquiry.id,
    status: inquiry.status,
    quantity: inquiry.quantity,
    targetPort: inquiry.target_port,
    createdAt: inquiry.created_at,
    updatedAt: inquiry.updated_at,
    buyerProfileId: inquiry.buyer_profile_id,
    viewerRole: isBuyer ? "buyer" : "supplier",
    product: toProductRef(join, opts.lang),
    messages: ((messageRows ?? []) as unknown as Array<{
      id: string;
      sender_profile_id: string;
      body: string;
      created_at: string;
    }>).map((m) => ({
      id: m.id,
      senderProfileId: m.sender_profile_id,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

/**
 * 发起询盘：校验商品已发布 → 建询盘 → 写首条消息。
 * PostgREST 无事务；首条消息写入失败时回删询盘，避免留下空线程。
 */
export async function createInquiry(opts: {
  buyerProfileId: string;
  productId: string;
  quantity: number;
  targetPort?: string | null;
  message: string;
}): Promise<WriteResult<{ id: string; createdAt: string }>> {
  if (!isConfigured()) {
    return { ok: false, code: "not_configured", message: "Supabase is not configured" };
  }
  const client = serviceClient();

  const { data: product, error: productError } = await client
    .schema("catalog")
    .from("products")
    .select("id")
    .eq("id", opts.productId)
    .eq("status", "published")
    .maybeSingle();
  if (productError) {
    return { ok: false, code: "product_lookup_failed", message: productError.message };
  }
  if (!product) {
    return { ok: false, code: "product_not_found", message: "Product not found or not published" };
  }

  const { data: inquiry, error: inquiryError } = await client
    .schema("crm")
    .from("inquiries")
    .insert({
      product_id: opts.productId,
      buyer_profile_id: opts.buyerProfileId,
      quantity: opts.quantity,
      target_port: opts.targetPort?.trim() || null,
      status: "open",
    })
    .select("id, created_at")
    .single();
  if (inquiryError || !inquiry) {
    return { ok: false, code: "inquiry_insert_failed", message: inquiryError?.message ?? "insert failed" };
  }

  const { error: messageError } = await client.schema("crm").from("inquiry_messages").insert({
    inquiry_id: inquiry.id,
    sender_profile_id: opts.buyerProfileId,
    body: opts.message,
  });
  if (messageError) {
    await client.schema("crm").from("inquiries").delete().eq("id", inquiry.id);
    return { ok: false, code: "message_insert_failed", message: messageError.message };
  }

  // TODO(P3): 触发 webhook 事件 inquiry.created
  return { ok: true, id: inquiry.id as string, createdAt: inquiry.created_at as string };
}

/** 在既有询盘下发消息（当事双方均可）。供应商首次回复时把状态 open → replied。 */
export async function addInquiryMessage(opts: {
  inquiryId: string;
  senderProfileId: string;
  body: string;
}): Promise<WriteResult<{ id: string; createdAt: string }>> {
  if (!isConfigured()) {
    return { ok: false, code: "not_configured", message: "Supabase is not configured" };
  }
  const detail = await getInquiryForParty({
    id: opts.inquiryId,
    viewerProfileId: opts.senderProfileId,
    lang: "zh",
  });
  if (!detail) {
    return { ok: false, code: "not_found", message: "Inquiry not found or access denied" };
  }

  const client = serviceClient();
  const { data, error } = await client
    .schema("crm")
    .from("inquiry_messages")
    .insert({
      inquiry_id: opts.inquiryId,
      sender_profile_id: opts.senderProfileId,
      body: opts.body,
    })
    .select("id, created_at")
    .single();
  if (error || !data) {
    return { ok: false, code: "message_insert_failed", message: error?.message ?? "insert failed" };
  }

  if (detail.viewerRole === "supplier" && detail.status === "open") {
    await client.schema("crm").from("inquiries").update({ status: "replied" }).eq("id", opts.inquiryId);
  }

  return { ok: true, id: data.id as string, createdAt: data.created_at as string };
}
