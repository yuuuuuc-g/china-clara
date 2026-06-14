-- Public dashboard snapshots for Macro Intel / Saturn News.

create table if not exists daily_briefings (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  source text not null,
  title text not null,
  url text not null,
  ai_summary text not null,
  created_at timestamp with time zone default now() not null
);

create unique index if not exists uniq_daily_briefings_date_url on daily_briefings(date, url);
create index if not exists idx_daily_briefings_date on daily_briefings(date desc);
create index if not exists idx_daily_briefings_created_at on daily_briefings(created_at desc);
