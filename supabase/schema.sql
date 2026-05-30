create extension if not exists "uuid-ossp";

create table documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content_markdown text not null,
  source_module text not null check (source_module in ('archive', 'analytical-pipeline', 'knowledge-graph')),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table analytical_sessions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade not null,
  source_issue text not null,
  phases jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

create index idx_documents_source_module on documents(source_module);
create index idx_documents_created_at on documents(created_at desc);
create index idx_analytical_sessions_document_id on analytical_sessions(document_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();

create table daily_briefings (
  id uuid primary key default uuid_generate_v4(),
  date date not null default current_date,
  source text not null,
  title text not null,
  url text not null,
  ai_summary text not null,
  created_at timestamp with time zone default now() not null
);

create unique index uniq_daily_briefings_date_url on daily_briefings(date, url);
create index idx_daily_briefings_date on daily_briefings(date desc);
create index idx_daily_briefings_created_at on daily_briefings(created_at desc);

alter table daily_briefings enable row level security;

create policy "daily_briefings_read_all" on daily_briefings
  for select
  using (true);

