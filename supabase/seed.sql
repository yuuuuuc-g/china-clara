-- China Clara · 样例内容（读懂中国）
-- 幂等：可重复执行。用于让内容纵切从空状态变真实渲染。
-- 应用方式：Dashboard → SQL Editor 粘贴运行，或
--   psql "<session-pooler-url>" -f supabase/seed.sql

-- 主题
insert into content.topics (slug, name_zh, name_es, name_en) values
  ('macro', '宏观经济', 'Macroeconomía', 'Macroeconomy')
on conflict (slug) do nothing;

-- 文章 1：双循环
insert into content.articles (slug, topic_id, source_lang, status, published_at)
select 'que-es-la-doble-circulacion',
       (select id from content.topics where slug = 'macro'),
       'zh', 'published', now() - interval '1 day'
on conflict (slug) do nothing;

insert into content.article_translations (article_id, lang, title, summary, body_md, human_reviewed)
select a.id, v.lang, v.title, v.summary, v.body_md, v.human_reviewed
from content.articles a
cross join (values
  ('zh',
   '什么是"双循环"？',
   '一文读懂中国"双循环"战略：内需为主体、国内国际互相促进。',
   E'## 背景\n\n"双循环"是中国近年宏观政策的核心表述之一，指以**国内大循环为主体、国内国际双循环相互促进**的新发展格局。\n\n## 对拉美出口商意味着什么\n\n- 内需市场持续扩大，进口消费品与农产品空间上升\n- 供应链本地化加速，中国制造商更主动出海设厂\n- 对"可信中间商"与本地化服务的需求同步上升\n\n> 理解政策语言，是读懂中国商业机会的第一步。',
   true),
  ('es',
   '¿Qué es la "doble circulación"?',
   'Entiende la estrategia china de "doble circulación": el mercado interno como eje, con los circuitos nacional e internacional reforzándose mutuamente.',
   E'## Contexto\n\nLa "doble circulación" es una de las formulaciones centrales de la política macroeconómica china reciente: un nuevo modelo de desarrollo con **el gran circuito interno como eje**, en el que los circuitos nacional e internacional se refuerzan mutuamente.\n\n## Qué significa para los exportadores latinoamericanos\n\n- Un mercado interno en expansión: más espacio para bienes de consumo y agroalimentos importados\n- Localización acelerada de las cadenas de suministro: los fabricantes chinos salen a producir fuera\n- Mayor demanda de intermediarios confiables y servicios locales\n\n> Entender el lenguaje de la política es el primer paso para leer las oportunidades de negocio en China.',
   false),
  ('en',
   'What is "dual circulation"?',
   'Understand China''s "dual circulation" strategy: the domestic market as the mainstay, with domestic and international loops reinforcing each other.',
   E'## Background\n\n"Dual circulation" is one of the core formulations of recent Chinese macro policy: a new development pattern with **the domestic loop as the mainstay**, where domestic and international loops reinforce each other.\n\n## What it means for Latin American exporters\n\n- An expanding domestic market: more room for imported consumer goods and agrifood\n- Accelerated supply-chain localization: Chinese manufacturers going out to produce abroad\n- Rising demand for trusted intermediaries and local services\n\n> Understanding the language of policy is the first step to reading business opportunities in China.',
   false)
) as v(lang, title, summary, body_md, human_reviewed)
where a.slug = 'que-es-la-doble-circulacion'
on conflict (article_id, lang) do nothing;

-- 文章 2：经济特区
insert into content.articles (slug, topic_id, source_lang, status, published_at)
select 'zonas-economicas-especiales',
       (select id from content.topics where slug = 'macro'),
       'zh', 'published', now() - interval '3 day'
on conflict (slug) do nothing;

insert into content.article_translations (article_id, lang, title, summary, body_md, human_reviewed)
select a.id, v.lang, v.title, v.summary, v.body_md, v.human_reviewed
from content.articles a
cross join (values
  ('zh',
   '中国经济特区简史',
   '从深圳到海南：经济特区如何塑造了中国的出口制造业。',
   E'## 从一个渔村说起\n\n1980 年，深圳成为中国第一批经济特区之一。四十多年后，它已是全球电子制造与硬件创新的中心。\n\n## 特区做对了什么\n\n1. 对外资与出口的税收优惠\n2. 更灵活的土地与劳动力政策\n3. 靠近港口，物流成本低\n\n对采购方而言，理解一个供应商**位于哪个产业带**，往往比看单个报价更重要。',
   true),
  ('es',
   'Breve historia de las zonas económicas especiales de China',
   'De Shenzhen a Hainan: cómo las zonas económicas especiales moldearon la manufactura exportadora china.',
   E'## Todo empezó en un pueblo de pescadores\n\nEn 1980, Shenzhen se convirtió en una de las primeras zonas económicas especiales de China. Cuatro décadas después es un centro mundial de manufactura electrónica e innovación en hardware.\n\n## Qué hicieron bien las zonas especiales\n\n1. Incentivos fiscales a la inversión extranjera y la exportación\n2. Políticas más flexibles de suelo y trabajo\n3. Cercanía a puertos y menores costos logísticos\n\nPara un comprador, entender **en qué clúster industrial** está un proveedor suele importar más que una cotización aislada.',
   true),
  ('en',
   'A short history of China''s special economic zones',
   'From Shenzhen to Hainan: how special economic zones shaped China''s export manufacturing.',
   E'## It started in a fishing village\n\nIn 1980, Shenzhen became one of China''s first special economic zones. Four decades later it is a global hub of electronics manufacturing and hardware innovation.\n\n## What the zones got right\n\n1. Tax incentives for foreign investment and exports\n2. More flexible land and labor policies\n3. Proximity to ports and lower logistics costs\n\nFor a buyer, understanding **which industrial cluster** a supplier sits in often matters more than any single quote.',
   true)
) as v(lang, title, summary, body_md, human_reviewed)
where a.slug = 'zonas-economicas-especiales'
on conflict (article_id, lang) do nothing;

-- ============================================================
-- catalog 域：供应商目录样例
-- ============================================================

insert into catalog.categories (slug, hs_prefix, name_zh, name_es, name_en) values
  ('lighting', '9405', '照明', 'Iluminación', 'Lighting'),
  ('textiles', '6305', '纺织品', 'Textiles', 'Textiles')
on conflict (slug) do nothing;

-- 供应商 1：深圳朗明电子（pro，已审核）
insert into catalog.suppliers (slug, company_name, company_name_en, province, city, founded_year, employees_range, website, verification_status, membership_tier)
values ('shenzhen-lumina-electronics', '深圳市朗明电子有限公司', 'Shenzhen Lumina Electronics Co., Ltd.', '广东', '深圳', 2013, '50-200', 'https://example.com/lumina', 'verified', 'pro')
on conflict (slug) do nothing;

-- 供应商 2：义乌索拉纺织（free，已审核）
insert into catalog.suppliers (slug, company_name, company_name_en, province, city, founded_year, employees_range, verification_status, membership_tier)
values ('yiwu-solaris-textile', '义乌市索拉纺织品有限公司', 'Yiwu Solaris Textile Co., Ltd.', '浙江', '义乌', 2016, '10-50', 'verified', 'free')
on conflict (slug) do nothing;

-- 一个待审核供应商（不应出现在公开列表，用于验证过滤）
insert into catalog.suppliers (slug, company_name, verification_status, membership_tier)
values ('pending-co', '待审核样例公司', 'pending', 'free')
on conflict (slug) do nothing;

-- 资质
insert into catalog.supplier_certifications (supplier_id, kind, file_url, verified)
select s.id, v.kind, v.file_url, v.verified
from catalog.suppliers s
cross join (values
  ('business_license', 'https://example.com/cert/bl.pdf', true),
  ('iso9001', 'https://example.com/cert/iso.pdf', true)
) as v(kind, file_url, verified)
where s.slug = 'shenzhen-lumina-electronics'
  and not exists (select 1 from catalog.supplier_certifications c where c.supplier_id = s.id and c.kind = v.kind);

-- 商品 + 三语文案
insert into catalog.products (slug, supplier_id, category_id, status, moq, price_min_usd, price_max_usd, origin_city)
select 'lumina-led-panel-40w',
       (select id from catalog.suppliers where slug = 'shenzhen-lumina-electronics'),
       (select id from catalog.categories where slug = 'lighting'),
       'published', 500, 8.00, 15.00, '深圳'
on conflict (slug) do nothing;

insert into catalog.products (slug, supplier_id, category_id, status, moq, price_min_usd, price_max_usd, origin_city)
select 'solaris-cotton-tote',
       (select id from catalog.suppliers where slug = 'yiwu-solaris-textile'),
       (select id from catalog.categories where slug = 'textiles'),
       'published', 2000, 0.80, 1.50, '义乌'
on conflict (slug) do nothing;

insert into catalog.product_translations (product_id, lang, name, description, human_reviewed)
select p.id, v.lang, v.name, v.description, v.human_reviewed
from catalog.products p
cross join (values
  ('zh', '40W LED 面板灯', '3000K-6500K 可选，CRI>80，适用于商业照明。', true),
  ('es', 'Panel LED 40W', '3000K-6500K, CRI>80, para iluminación comercial.', false),
  ('en', '40W LED Panel Light', '3000K-6500K, CRI>80, for commercial lighting.', false)
) as v(lang, name, description, human_reviewed)
where p.slug = 'lumina-led-panel-40w'
on conflict (product_id, lang) do nothing;

insert into catalog.product_translations (product_id, lang, name, description, human_reviewed)
select p.id, v.lang, v.name, v.description, v.human_reviewed
from catalog.products p
cross join (values
  ('zh', '全棉手提袋', '180g/m² 帆布，可定制印刷。', true),
  ('es', 'Bolsa de algodón', 'Lona de 180 g/m², impresión personalizable.', false),
  ('en', 'Cotton Tote Bag', '180 gsm canvas, custom printing available.', false)
) as v(lang, name, description, human_reviewed)
where p.slug = 'solaris-cotton-tote'
on conflict (product_id, lang) do nothing;
