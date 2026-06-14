-- Baseline row-level security.
-- Browser anon clients should not get direct writes to user/content tables.
-- Service-role server routes bypass RLS for ingestion and repository writes.

alter table topics enable row level security;
alter table documents enable row level security;
alter table analytical_sessions enable row level security;
alter table daily_briefings enable row level security;
alter table rag_books enable row level security;
alter table rag_chunks enable row level security;

drop policy if exists "topics_select_authenticated" on topics;
create policy "topics_select_authenticated" on topics
  for select
  to authenticated
  using (true);

drop policy if exists "topics_insert_authenticated" on topics;
create policy "topics_insert_authenticated" on topics
  for insert
  to authenticated
  with check (true);

drop policy if exists "topics_update_authenticated" on topics;
create policy "topics_update_authenticated" on topics
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "topics_delete_authenticated" on topics;
create policy "topics_delete_authenticated" on topics
  for delete
  to authenticated
  using (true);

drop policy if exists "documents_select_authenticated" on documents;
create policy "documents_select_authenticated" on documents
  for select
  to authenticated
  using (true);

drop policy if exists "documents_insert_authenticated" on documents;
create policy "documents_insert_authenticated" on documents
  for insert
  to authenticated
  with check (true);

drop policy if exists "documents_update_authenticated" on documents;
create policy "documents_update_authenticated" on documents
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "documents_delete_authenticated" on documents;
create policy "documents_delete_authenticated" on documents
  for delete
  to authenticated
  using (true);

drop policy if exists "analytical_sessions_select_authenticated" on analytical_sessions;
create policy "analytical_sessions_select_authenticated" on analytical_sessions
  for select
  to authenticated
  using (true);

drop policy if exists "analytical_sessions_insert_authenticated" on analytical_sessions;
create policy "analytical_sessions_insert_authenticated" on analytical_sessions
  for insert
  to authenticated
  with check (true);

drop policy if exists "analytical_sessions_delete_authenticated" on analytical_sessions;
create policy "analytical_sessions_delete_authenticated" on analytical_sessions
  for delete
  to authenticated
  using (true);

drop policy if exists "daily_briefings_read_all" on daily_briefings;
create policy "daily_briefings_read_all" on daily_briefings
  for select
  using (true);

drop policy if exists "rag_books_select_authenticated" on rag_books;
create policy "rag_books_select_authenticated" on rag_books
  for select
  to authenticated
  using (true);

drop policy if exists "rag_chunks_select_authenticated" on rag_chunks;
create policy "rag_chunks_select_authenticated" on rag_chunks
  for select
  to authenticated
  using (true);
