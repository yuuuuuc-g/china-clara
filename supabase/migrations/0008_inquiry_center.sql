-- China Clara · 询盘中心纵切：profile 自动创建 + 询盘 RLS 补全
-- 1) auth.users 新增用户时自动建 crm.profiles（应用层另有 ensureProfile 兜底，双保险）。
-- 2) 0005 只给了 inquiry_messages 的 select 策略，补 insert（当事双方才能发消息）。
-- 3) 买家可更新自己询盘（如关闭）；消息写入时刷新询盘 updated_at 便于按活跃度排序。

create or replace function crm.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = crm, public
as $$
begin
  insert into crm.profiles (id, display_name, preferred_lang)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_lang', ''), 'es')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function crm.handle_new_user();

-- 当事双方（买家 / 商品所属供应商的 owner）可在询盘下发消息，且只能以自己身份发
create policy messages_parties_insert on crm.inquiry_messages
  for insert with check (
    sender_profile_id = auth.uid()
    and exists (
      select 1 from crm.inquiries i where i.id = inquiry_id and (
        i.buyer_profile_id = auth.uid()
        or exists (
          select 1 from catalog.products p
          join catalog.suppliers s on s.id = p.supplier_id
          where p.id = i.product_id and s.owner_profile_id = auth.uid()))));

-- 买家可更新自己的询盘（状态流转，如 closed）
create policy inquiries_buyer_update on crm.inquiries
  for update using (buyer_profile_id = auth.uid())
  with check (buyer_profile_id = auth.uid());

-- 新消息 = 询盘有新动态：刷新 updated_at，列表按活跃度排序
create or replace function crm.touch_inquiry_on_message()
returns trigger
language plpgsql
security definer
set search_path = crm
as $$
begin
  update crm.inquiries set updated_at = now() where id = new.inquiry_id;
  return new;
end;
$$;

drop trigger if exists on_inquiry_message_created on crm.inquiry_messages;
create trigger on_inquiry_message_created
  after insert on crm.inquiry_messages
  for each row execute function crm.touch_inquiry_on_message();
