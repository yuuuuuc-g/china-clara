-- China Clara · RLS 策略 + 跨域外键补全
-- 原则：公开内容任何人可读；写操作看角色；询盘只有当事双方可见。

alter table content.articles add constraint articles_author_fk
  foreign key (author_profile_id) references crm.profiles(id);
alter table catalog.suppliers add constraint suppliers_owner_fk
  foreign key (owner_profile_id) references crm.profiles(id);

-- content：已发布内容公开可读
alter table content.topics enable row level security;
alter table content.articles enable row level security;
alter table content.article_translations enable row level security;
alter table content.briefings enable row level security;
alter table content.intelligence_sources enable row level security;
alter table content.source_articles enable row level security;

create policy topics_public_read on content.topics for select using (true);
create policy articles_public_read on content.articles
  for select using (status = 'published');
create policy article_tr_public_read on content.article_translations
  for select using (exists (
    select 1 from content.articles a
    where a.id = article_id and a.status = 'published'));
create policy briefings_public_read on content.briefings for select using (true);

-- catalog：已发布商品与已验证供应商公开可读；供应商写自己的
alter table catalog.suppliers enable row level security;
alter table catalog.products enable row level security;
alter table catalog.product_translations enable row level security;
alter table catalog.product_media enable row level security;
alter table catalog.categories enable row level security;
alter table catalog.supplier_certifications enable row level security;

create policy categories_public_read on catalog.categories for select using (true);
create policy suppliers_public_read on catalog.suppliers
  for select using (verification_status = 'verified');
create policy suppliers_own_write on catalog.suppliers
  for all using (owner_profile_id = auth.uid());
create policy products_public_read on catalog.products
  for select using (status = 'published');
create policy products_own_write on catalog.products
  for all using (exists (
    select 1 from catalog.suppliers s
    where s.id = supplier_id and s.owner_profile_id = auth.uid()));

-- crm：询盘仅当事双方（买家 / 供应商所有者）可见
alter table crm.profiles enable row level security;
alter table crm.inquiries enable row level security;
alter table crm.inquiry_messages enable row level security;
alter table crm.deal_outcomes enable row level security;
alter table crm.api_tokens enable row level security;
alter table crm.webhook_endpoints enable row level security;

create policy profiles_self on crm.profiles
  for all using (id = auth.uid());
create policy inquiries_parties on crm.inquiries
  for select using (
    buyer_profile_id = auth.uid()
    or exists (
      select 1 from catalog.products p
      join catalog.suppliers s on s.id = p.supplier_id
      where p.id = product_id and s.owner_profile_id = auth.uid()));
create policy inquiries_buyer_insert on crm.inquiries
  for insert with check (buyer_profile_id = auth.uid());
create policy messages_parties on crm.inquiry_messages
  for select using (exists (
    select 1 from crm.inquiries i where i.id = inquiry_id and (
      i.buyer_profile_id = auth.uid()
      or exists (
        select 1 from catalog.products p
        join catalog.suppliers s on s.id = p.supplier_id
        where p.id = i.product_id and s.owner_profile_id = auth.uid()))));
create policy tokens_own on crm.api_tokens
  for all using (owner_profile_id = auth.uid());
create policy webhooks_own on crm.webhook_endpoints
  for all using (owner_profile_id = auth.uid());

-- community：发布内容公开读，作者写自己的
alter table community.posts enable row level security;
alter table community.post_revisions enable row level security;
alter table community.comments enable row level security;
alter table community.reactions enable row level security;
alter table community.moderation_flags enable row level security;

create policy posts_public_read on community.posts
  for select using (status = 'published' or author_profile_id = auth.uid());
create policy posts_own_write on community.posts
  for all using (author_profile_id = auth.uid());
create policy comments_public_read on community.comments for select using (true);
create policy comments_own_write on community.comments
  for insert with check (author_profile_id = auth.uid());
