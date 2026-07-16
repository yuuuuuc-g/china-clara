-- China Clara · crm 域：用户 + 询盘 + 外部接入
-- 铁律：没有订单表。支付由双方自行商议，平台只记录询盘与沟通。
create schema if not exists crm;

create table crm.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','supplier','editor','admin')),
  display_name text,
  country char(2),
  preferred_lang text not null default 'es' check (preferred_lang in ('zh','es','en')),
  reputation int not null default 0,
  created_at timestamptz not null default now()
);

create table crm.inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog.products(id),
  buyer_profile_id uuid not null references crm.profiles(id),
  quantity int not null check (quantity > 0),
  target_port text,
  status text not null default 'open'
    check (status in ('open','replied','negotiating','closed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table crm.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references crm.inquiries(id) on delete cascade,
  sender_profile_id uuid not null references crm.profiles(id),
  body text not null,
  body_translated text, -- AI 互译缓存
  translated_lang text check (translated_lang in ('zh','es','en')),
  created_at timestamptz not null default now()
);

-- 成交回访（选填）：供应商续费的证据链
create table crm.deal_outcomes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references crm.inquiries(id) unique,
  did_close boolean not null,
  amount_band text, -- '<5k' | '5k-20k' | '20k-100k' | '>100k'
  feedback text,
  reported_by uuid references crm.profiles(id),
  reported_at timestamptz not null default now()
);

-- 外部项目接入（API-first）
create table crm.api_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references crm.profiles(id),
  name text not null, -- 'personal-blog' / 'my-shop' / ...
  token_hash text not null unique, -- SHA-256，明文永不落库
  scopes text[] not null default '{}',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table crm.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references crm.profiles(id),
  url text not null,
  events text[] not null default '{}', -- inquiry.created / article.published / user.registered
  secret text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on crm.inquiries (buyer_profile_id, created_at desc);
create index on crm.inquiries (product_id);
create index on crm.inquiry_messages (inquiry_id, created_at);
