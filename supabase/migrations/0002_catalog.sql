-- China Clara · catalog 域：供应商 + 商品（只展示，不交易）
create schema if not exists catalog;

create table catalog.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid, -- crm.profiles，外键在 0005
  company_name text not null,
  company_name_en text,
  province text,
  city text,
  founded_year int,
  employees_range text,
  website text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected','suspended')),
  membership_tier text not null default 'free' check (membership_tier in ('free','pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog.supplier_certifications (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references catalog.suppliers(id) on delete cascade,
  kind text not null, -- business_license / iso9001 / export_license / ...
  file_url text not null,
  verified boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create table catalog.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  hs_prefix text, -- HS code 前 4 位，便于拉美买家报关调研
  parent_id uuid references catalog.categories(id),
  name_zh text not null,
  name_es text not null,
  name_en text not null
);

create table catalog.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references catalog.suppliers(id) on delete cascade,
  category_id uuid references catalog.categories(id),
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  moq int,
  price_min_usd numeric(12,2),
  price_max_usd numeric(12,2),
  origin_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table catalog.product_translations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog.products(id) on delete cascade,
  lang text not null check (lang in ('zh','es','en')),
  name text not null,
  description text,
  human_reviewed boolean not null default false,
  unique (product_id, lang)
);

create table catalog.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references catalog.products(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','video')),
  url text not null,
  sort int not null default 0
);

create index on catalog.products (status, created_at desc);
create index on catalog.products (supplier_id);
create index on catalog.product_translations (lang);
