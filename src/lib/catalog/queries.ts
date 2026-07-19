import { serviceClient } from "@/src/lib/supabase/service";
import type { Locale } from "@/src/i18n/config";

/**
 * catalog 域「供应商目录」查询层。/api/v1 路由与 SSR 页共用（API-first）。
 * Supabase 未配置或出错时优雅返回空，不抛错。
 * 供应商名本地化：zh 用 company_name；es/en 用 company_name_en，缺则回退 company_name。
 */

export interface SupplierListItem {
  id: string;
  slug: string;
  companyName: string;
  province: string | null;
  city: string | null;
  foundedYear: number | null;
  employeesRange: string | null;
  membershipTier: string;
}

export interface SupplierProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  moq: number | null;
  priceMinUsd: number | null;
  priceMaxUsd: number | null;
}

export interface SupplierDetail extends SupplierListItem {
  companyNameZh: string;
  companyNameEn: string | null;
  website: string | null;
  certifications: { kind: string; verified: boolean }[];
  products: SupplierProduct[];
}

interface RawSupplier {
  id: string;
  slug: string;
  company_name: string;
  company_name_en: string | null;
  province: string | null;
  city: string | null;
  founded_year: number | null;
  employees_range: string | null;
  membership_tier: string;
  website?: string | null;
  certifications?: { kind: string; verified: boolean }[];
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY)
  );
}

function localizedName(row: RawSupplier, lang: Locale): string {
  if (lang === "zh") return row.company_name;
  return row.company_name_en || row.company_name;
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

const LIST_SELECT =
  "id, slug, company_name, company_name_en, province, city, founded_year, employees_range, membership_tier";

export async function listVerifiedSuppliers(opts: {
  lang: Locale;
  page?: number;
  perPage?: number;
}): Promise<{ items: SupplierListItem[]; total: number; page: number; perPage: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(50, Math.max(1, opts.perPage ?? 20));
  if (!isConfigured()) return { items: [], total: 0, page, perPage };

  const { data, error, count } = await serviceClient()
    .schema("catalog")
    .from("suppliers")
    .select(LIST_SELECT, { count: "exact" })
    .eq("verification_status", "verified")
    .order("membership_tier", { ascending: false }) // pro 在前
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (error) {
    console.error("[catalog.queries] listVerifiedSuppliers failed:", error.message);
    return { items: [], total: 0, page, perPage };
  }
  if (!data) return { items: [], total: 0, page, perPage };

  const items = (data as unknown as RawSupplier[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    companyName: localizedName(row, opts.lang),
    province: row.province,
    city: row.city,
    foundedYear: row.founded_year,
    employeesRange: row.employees_range,
    membershipTier: row.membership_tier,
  }));

  return { items, total: count ?? items.length, page, perPage };
}

export interface ProductForInquiry {
  id: string;
  slug: string;
  name: string;
  moq: number | null;
  supplierSlug: string | null;
  supplierName: string | null;
}

/** 发起询盘页用：按 slug 取已发布商品（含供应商名，本地化）。 */
export async function getPublishedProductBySlug(opts: {
  lang: Locale;
  slug: string;
}): Promise<ProductForInquiry | null> {
  if (!isConfigured()) return null;

  const { data, error } = await serviceClient()
    .schema("catalog")
    .from("products")
    .select(
      "id, slug, moq, supplier:supplier_id (slug, company_name, company_name_en), translations:product_translations (lang, name)"
    )
    .eq("slug", opts.slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("[catalog.queries] getPublishedProductBySlug failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    slug: string;
    moq: number | null;
    supplier: { slug: string; company_name: string; company_name_en: string | null } | null;
    translations: { lang: string; name: string }[];
  };
  const byLang = new Map(row.translations.map((t) => [t.lang, t.name]));
  const name = byLang.get(opts.lang) ?? byLang.get("zh") ?? row.translations[0]?.name ?? "";

  return {
    id: row.id,
    slug: row.slug,
    name,
    moq: row.moq,
    supplierSlug: row.supplier?.slug ?? null,
    supplierName: row.supplier
      ? opts.lang === "zh"
        ? row.supplier.company_name
        : row.supplier.company_name_en || row.supplier.company_name
      : null,
  };
}

export async function getSupplierBySlug(opts: {
  lang: Locale;
  slug: string;
}): Promise<SupplierDetail | null> {
  if (!isConfigured()) return null;
  const client = serviceClient();

  const { data, error } = await client
    .schema("catalog")
    .from("suppliers")
    .select(
      "id, slug, company_name, company_name_en, province, city, founded_year, employees_range, membership_tier, website, certifications:supplier_certifications(kind, verified)"
    )
    .eq("slug", opts.slug)
    .eq("verification_status", "verified")
    .maybeSingle();

  if (error) {
    console.error("[catalog.queries] getSupplierBySlug failed:", error.message);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as RawSupplier;

  const { data: productRows, error: productError } = await client
    .schema("catalog")
    .from("products")
    .select(
      "id, slug, moq, price_min_usd, price_max_usd, translation:product_translations!inner(name, description, lang)"
    )
    .eq("supplier_id", row.id)
    .eq("status", "published")
    .eq("product_translations.lang", opts.lang)
    .order("created_at", { ascending: false });

  if (productError) {
    console.error("[catalog.queries] supplier products failed:", productError.message);
  }

  const products: SupplierProduct[] = ((productRows ?? []) as unknown as Array<{
    id: string;
    slug: string;
    moq: number | null;
    price_min_usd: unknown;
    price_max_usd: unknown;
    translation: { name: string; description: string | null }[] | { name: string; description: string | null } | null;
  }>)
    .map((p) => {
      const t = Array.isArray(p.translation) ? p.translation[0] : p.translation;
      if (!t) return null;
      return {
        id: p.id,
        slug: p.slug,
        name: t.name,
        description: t.description ?? null,
        moq: p.moq,
        priceMinUsd: toNum(p.price_min_usd),
        priceMaxUsd: toNum(p.price_max_usd),
      };
    })
    .filter((x): x is SupplierProduct => x !== null);

  return {
    id: row.id,
    slug: row.slug,
    companyName: localizedName(row, opts.lang),
    companyNameZh: row.company_name,
    companyNameEn: row.company_name_en,
    province: row.province,
    city: row.city,
    foundedYear: row.founded_year,
    employeesRange: row.employees_range,
    membershipTier: row.membership_tier,
    website: row.website ?? null,
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    products,
  };
}
