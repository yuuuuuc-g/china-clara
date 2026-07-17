-- China Clara · 给 catalog.suppliers 加 slug（SEO 友好的供应商详情 URL /suppliers/<slug>）
-- 与 articles / products 的 slug 约定一致。当前表为空，直接加 not null unique 安全。

alter table catalog.suppliers add column if not exists slug text;

-- 已有行（若有）用 id 前 8 位兜底填充，避免 not null 失败。
update catalog.suppliers set slug = left(id::text, 8) where slug is null;

alter table catalog.suppliers alter column slug set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_slug_key'
  ) then
    alter table catalog.suppliers add constraint suppliers_slug_key unique (slug);
  end if;
end $$;
