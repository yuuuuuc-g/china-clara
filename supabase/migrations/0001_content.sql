-- China Clara · content 域：读懂中国 + 情报
create schema if not exists content;

create table content.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  parent_id uuid references content.topics(id),
  name_zh text not null,
  name_es text not null,
  name_en text not null,
  created_at timestamptz not null default now()
);

create table content.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  topic_id uuid references content.topics(id),
  source_lang text not null default 'zh' check (source_lang in ('zh','es','en')),
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  author_profile_id uuid, -- crm.profiles，跨域引用在 0005 中补外键
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table content.article_translations (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references content.articles(id) on delete cascade,
  lang text not null check (lang in ('zh','es','en')),
  title text not null,
  summary text,
  body_md text not null,
  human_reviewed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (article_id, lang)
);

-- 情报管线（结构移植自 knowledge-galaxy）
create table content.intelligence_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null unique,
  kind text not null default 'rss',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table content.source_articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references content.intelligence_sources(id),
  external_id text,
  title text not null,
  url text not null,
  raw_excerpt text,
  fetched_at timestamptz not null default now(),
  unique (source_id, url)
);

create table content.briefings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily','weekly')),
  lang text not null check (lang in ('zh','es','en')),
  title text not null,
  body_md text not null,
  covers_date date not null,
  created_at timestamptz not null default now()
);

create index on content.articles (status, published_at desc);
create index on content.article_translations (lang);
create index on content.source_articles (fetched_at desc);
