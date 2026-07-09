-- Row-level security backfill.
--
-- Migration 0004 enabled RLS only on the six core content tables, so a
-- database built purely from the migration chain left the intelligence,
-- macro, supply-chain, and X social-signal tables with RLS disabled (fully
-- open to the anon key). This migration reconciles the migration history with
-- the intent already captured in supabase/schema.sql.
--
-- Posture:
-- - All application access is server-side via the service-role key, which
--   bypasses RLS. Policies below only govern anon / authenticated roles.
-- - Public dashboard tables stay readable (matching schema.sql).
-- - Operational tables (ingestion jobs, scan state) are authenticated-read.
-- - X social-signal tables are ingest-only internal data: RLS on, no policy,
--   so nothing but the service role can touch them.

alter table intelligence_sources enable row level security;
alter table source_articles enable row level security;
alter table ingestion_jobs enable row level security;
alter table module_scan_state enable row level security;
alter table macro_intel_items enable row level security;
alter table apac_supply_chain_signals enable row level security;
alter table x_watch_rules enable row level security;
alter table x_signal_items enable row level security;

drop policy if exists "intelligence_sources_read_all" on intelligence_sources;
create policy "intelligence_sources_read_all" on intelligence_sources
  for select
  using (true);

drop policy if exists "source_articles_read_all" on source_articles;
create policy "source_articles_read_all" on source_articles
  for select
  using (true);

drop policy if exists "ingestion_jobs_read_authenticated" on ingestion_jobs;
create policy "ingestion_jobs_read_authenticated" on ingestion_jobs
  for select
  to authenticated
  using (true);

drop policy if exists "module_scan_state_read_authenticated" on module_scan_state;
create policy "module_scan_state_read_authenticated" on module_scan_state
  for select
  to authenticated
  using (true);

drop policy if exists "macro_intel_items_read_all" on macro_intel_items;
create policy "macro_intel_items_read_all" on macro_intel_items
  for select
  using (true);

drop policy if exists "apac_supply_chain_signals_read_all" on apac_supply_chain_signals;
create policy "apac_supply_chain_signals_read_all" on apac_supply_chain_signals
  for select
  using (true);
