create extension if not exists "uuid-ossp";

-- Archive core: central documents plus module-specific analytical session metadata.

create table if not exists topics (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content_markdown text not null,
  source_module text not null check (source_module in ('archive', 'analytical-pipeline', 'knowledge-graph')),
  topic_id uuid references topics(id) on delete set null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table documents
  add column if not exists topic_id uuid references topics(id) on delete set null;

create table if not exists analytical_sessions (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references documents(id) on delete cascade not null,
  source_issue text not null,
  phases jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now() not null
);

create index if not exists idx_topics_created_at on topics(created_at desc);
create index if not exists idx_topics_updated_at on topics(updated_at desc);
create index if not exists idx_documents_topic_id on documents(topic_id);
create index if not exists idx_documents_source_module on documents(source_module);
create index if not exists idx_documents_created_at on documents(created_at desc);
create index if not exists idx_documents_updated_at on documents(updated_at desc);
create index if not exists idx_analytical_sessions_document_id on analytical_sessions(document_id);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_topics_updated_at on topics;
create trigger update_topics_updated_at
  before update on topics
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_documents_updated_at on documents;
create trigger update_documents_updated_at
  before update on documents
  for each row
  execute function update_updated_at_column();
