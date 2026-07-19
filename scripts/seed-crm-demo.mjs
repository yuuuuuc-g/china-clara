#!/usr/bin/env node

/**
 * 询盘中心演示数据：demo 买家 / demo 供应商账号 + 一条带往来消息的样例询盘。
 * 建设期联调与验收用；幂等，可重复执行。
 *
 * 用法：
 *   DEMO_PASSWORD=<自定密码> node scripts/seed-crm-demo.mjs
 *
 * 依赖 .env.local 里的 NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY。
 * 账号：demo-buyer@chinaclara.dev（买家）、demo-supplier@chinaclara.dev（供应商，
 * 绑定 shenzhen-lumina-electronics 的 owner_profile_id）。
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Set DEMO_PASSWORD (>= 8 chars) for the demo accounts");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

/** 找回或创建已确认邮箱的演示用户，返回 user id。 */
async function ensureUser(email, displayName, preferredLang) {
  const { data: page, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) throw new Error(`listUsers failed: ${listError.message}`);
  const existing = page.users.find((u) => u.email === email);
  if (existing) {
    // 密码同步为本次 DEMO_PASSWORD，保证可登录
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, preferred_lang: preferredLang },
  });
  if (error) throw new Error(`createUser ${email} failed: ${error.message}`);
  return data.user.id;
}

/** 迁移 0008 的触发器负责建 profile；老用户或触发器缺位时兜底补建。 */
async function ensureProfile(id, displayName, preferredLang, role) {
  const { error } = await admin
    .schema("crm")
    .from("profiles")
    .upsert({ id, display_name: displayName, preferred_lang: preferredLang, role });
  if (error) throw new Error(`profile upsert failed: ${error.message}`);
}

async function main() {
  const buyerId = await ensureUser("demo-buyer@chinaclara.dev", "Importadora Andina Demo", "es");
  await ensureProfile(buyerId, "Importadora Andina Demo", "es", "user");

  const supplierId = await ensureUser("demo-supplier@chinaclara.dev", "朗明电子（演示）", "zh");
  await ensureProfile(supplierId, "朗明电子（演示）", "zh", "supplier");

  const editorId = await ensureUser("demo-editor@chinaclara.dev", "内容编辑（演示）", "zh");
  await ensureProfile(editorId, "内容编辑（演示）", "zh", "editor");

  const { data: supplier, error: supplierError } = await admin
    .schema("catalog")
    .from("suppliers")
    .update({ owner_profile_id: supplierId })
    .eq("slug", "shenzhen-lumina-electronics")
    .select("id")
    .maybeSingle();
  if (supplierError) throw new Error(`supplier owner update failed: ${supplierError.message}`);
  if (!supplier) throw new Error("supplier shenzhen-lumina-electronics not found — run supabase/seed.sql first");

  const { data: product, error: productError } = await admin
    .schema("catalog")
    .from("products")
    .select("id")
    .eq("slug", "lumina-led-panel-40w")
    .maybeSingle();
  if (productError || !product) {
    throw new Error("product lumina-led-panel-40w not found — run supabase/seed.sql first");
  }

  await seedInquiryThread(buyerId, supplierId, product.id);
  await seedCommunityPost(buyerId);
  await seedZhOnlyArticle();
}

/** 样例询盘线程（幂等：已存在则跳过）。抽成函数避免 main 里 early-return 漏掉后续 seed。 */
async function seedInquiryThread(buyerId, supplierId, productId) {
  const { data: existingInquiry } = await admin
    .schema("crm")
    .from("inquiries")
    .select("id")
    .eq("buyer_profile_id", buyerId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existingInquiry) {
    console.log(`Demo inquiry already exists: ${existingInquiry.id}`);
    return;
  }

  const { data: inquiry, error: inquiryError } = await admin
    .schema("crm")
    .from("inquiries")
    .insert({
      product_id: productId,
      buyer_profile_id: buyerId,
      quantity: 1000,
      target_port: "Callao, Perú",
      status: "replied",
    })
    .select("id")
    .single();
  if (inquiryError) throw new Error(`inquiry insert failed: ${inquiryError.message}`);

  const messages = [
    {
      inquiry_id: inquiry.id,
      sender_profile_id: buyerId,
      body: "Hola, nos interesa el panel LED de 40W. ¿Podrían cotizar 1000 unidades CIF Callao, con certificación CE? Plazo ideal: 45 días.",
    },
    {
      inquiry_id: inquiry.id,
      sender_profile_id: supplierId,
      body: "您好！感谢询价。1000 片 40W 面板 CIF Callao 可以做到 USD 9.80/片，含 CE 证书，交期 35 天。如需样品可先寄 2 片。",
    },
  ];
  for (const msg of messages) {
    const { error } = await admin.schema("crm").from("inquiry_messages").insert(msg);
    if (error) throw new Error(`message insert failed: ${error.message}`);
  }

  console.log(`Seeded demo inquiry ${inquiry.id}`);
  console.log("Accounts: demo-buyer@chinaclara.dev / demo-supplier@chinaclara.dev (password = DEMO_PASSWORD)");
}

/** 只有中文源文的已发布文章：给文章翻译管线当输入（跑一次 translate-articles cron 即补齐西/英）。 */
async function seedZhOnlyArticle() {
  const slug = "guangjiaohui-caigou-zhinan-demo";
  const { data: existing } = await admin
    .schema("content")
    .from("articles")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    console.log(`Demo zh-only article already exists: ${existing.id}`);
    return;
  }
  const { data: article, error } = await admin
    .schema("content")
    .from("articles")
    .insert({ slug, source_lang: "zh", status: "published", published_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error) throw new Error(`article insert failed: ${error.message}`);

  const { error: trError } = await admin.schema("content").from("article_translations").insert({
    article_id: article.id,
    lang: "zh",
    title: "第一次逛广交会：拉美买家实用指南",
    summary: "从展位预约到样品谈判，一文说清拉美买家参加广交会的关键动作。",
    body_md:
      "## 行前准备\n\n1. 提前 30 天办好签证与邀请函。\n2. 用官方 App 预约目标展位，按产业带规划动线。\n\n## 展会现场\n\n- 名片准备双语版本，微信二维码印在背面。\n- 样品谈判先问 **MOQ 与交期**，价格放在最后。\n\n> 广交会的真正价值不在下单，而在建立可回访的供应商名单。",
    human_reviewed: true,
  });
  if (trError) throw new Error(`zh translation insert failed: ${trError.message}`);
  console.log(`Seeded demo zh-only article ${article.id}`);
}

/** 社区样例帖（已发布），让 /community 列表不是空状态。幂等：按 slug 跳过。 */
async function seedCommunityPost(authorId) {
  const slug = "primera-importacion-desde-yiwu-demo";
  const { data: existing } = await admin
    .schema("community")
    .from("posts")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    console.log(`Demo community post already exists: ${existing.id}`);
    return;
  }
  const { data: post, error } = await admin
    .schema("community")
    .from("posts")
    .insert({
      author_profile_id: authorId,
      slug,
      lang: "es",
      title: "Lo que aprendí en mi primera importación desde Yiwu",
      body_md:
        "## Contexto\n\nPrimera compra: 2000 bolsas de algodón personalizadas. Comparto lo que me hubiera gustado saber antes.\n\n## Tres lecciones\n\n1. **Pide muestras siempre**, aunque el proveedor tenga buenas certificaciones.\n2. El MOQ casi siempre es negociable si aceptas plazos más largos.\n3. Presupuesta la inspección pre-embarque: cuesta poco comparado con un contenedor defectuoso.\n\n> La transparencia del proveedor en los primeros mensajes predice cómo será el resto del trato.",
      status: "published",
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`community post insert failed: ${error.message}`);
  console.log(`Seeded demo community post ${post.id}`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
