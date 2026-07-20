-- China Clara · 社区互动：补 reactions 的 RLS 策略
-- 0005 给 community.reactions 开了 RLS 但没写任何策略（等于全拒，只有 service role 可用）。
-- 补齐：点赞数公开可读；登录用户只能增删自己的 reaction。

create policy reactions_public_read on community.reactions
  for select using (true);

create policy reactions_own_insert on community.reactions
  for insert with check (profile_id = auth.uid());

create policy reactions_own_delete on community.reactions
  for delete using (profile_id = auth.uid());
