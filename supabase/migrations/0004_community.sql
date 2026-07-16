-- China Clara · community 域：用户文章与互动
create schema if not exists community;

create table community.posts (
  id uuid primary key default gen_random_uuid(),
  author_profile_id uuid not null references crm.profiles(id),
  slug text not null unique,
  lang text not null check (lang in ('zh','es','en')),
  title text not null,
  body_md text not null,
  status text not null default 'review' check (status in ('review','published','rejected','archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table community.post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community.posts(id) on delete cascade,
  title text not null,
  body_md text not null,
  created_at timestamptz not null default now()
);

create table community.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community.posts(id) on delete cascade,
  author_profile_id uuid not null references crm.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table community.reactions (
  post_id uuid not null references community.posts(id) on delete cascade,
  profile_id uuid not null references crm.profiles(id),
  kind text not null default 'like',
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id, kind)
);

create table community.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('post','comment')),
  target_id uuid not null,
  reporter_profile_id uuid references crm.profiles(id),
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index on community.posts (status, published_at desc);
