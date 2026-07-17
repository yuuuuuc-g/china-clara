-- China Clara · 给四域 schema 授予 API 角色权限
-- 迁移建了表，但 PostgREST 的角色（anon / authenticated / service_role）访问自定义
-- schema 需要显式 GRANT，否则报 42501 "permission denied for schema"。
-- 行级门禁由 0005 的 RLS 负责：service_role 绕过 RLS（网关角色），
-- anon/authenticated 仍受 RLS 约束，因此这里放开表级权限是安全的
-- （与 Supabase 对 public schema 的默认做法一致）。

do $$
declare
  s text;
begin
  foreach s in array array['content', 'catalog', 'crm', 'community'] loop
    execute format('grant usage on schema %I to anon, authenticated, service_role', s);
    execute format('grant all on all tables in schema %I to anon, authenticated, service_role', s);
    execute format('grant all on all sequences in schema %I to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant all on tables to anon, authenticated, service_role', s);
    execute format('alter default privileges in schema %I grant all on sequences to anon, authenticated, service_role', s);
  end loop;
end $$;
