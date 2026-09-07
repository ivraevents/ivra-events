-- =====================================================================
-- Migration 0025: Admin-facing notification dispatch
-- =====================================================================
-- notify() itself was locked down to internal-only use in migration
-- 0024 (it must never be reachable directly, since it lets the caller
-- write an arbitrary title/body/link to any user_id). Admins still
-- have a legitimate need to notify one user or broadcast to a role, so
-- this migration adds a purpose-built, authorization-checked entry
-- point instead of re-opening notify() itself.
-- ---------------------------------------------------------------------

create or replace function public.admin_send_notification(
  p_user_id uuid, p_title text, p_body text default null, p_link_path text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin only' using errcode = 'P0001';
  end if;
  perform public.notify(p_user_id, 'general', p_title, p_body, p_link_path);
  perform public.write_audit_log('notification.admin_send', 'notifications', p_user_id,
    null, jsonb_build_object('title', p_title, 'body', p_body));
end;
$$;

grant execute on function public.admin_send_notification(uuid, text, text, text) to authenticated;

-- Broadcast to every user holding a given role, or every user at all
-- when p_role_key is null. Returns the number of notifications sent.
create or replace function public.admin_broadcast_notification(
  p_title text, p_body text default null, p_link_path text default null, p_role_key text default null
) returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN: admin only' using errcode = 'P0001';
  end if;

  if p_role_key is null then
    insert into public.notifications (user_id, type, title, body, link_path)
    select id, 'general'::public.notification_type, p_title, p_body, p_link_path from public.profiles;
  else
    insert into public.notifications (user_id, type, title, body, link_path)
    select distinct user_id, 'general'::public.notification_type, p_title, p_body, p_link_path
    from public.user_roles where role_key = p_role_key;
  end if;

  get diagnostics v_count = row_count;
  perform public.write_audit_log('notification.admin_broadcast', 'notifications', null,
    null, jsonb_build_object('title', p_title, 'body', p_body, 'role_key', p_role_key, 'recipients', v_count));
  return v_count;
end;
$$;

grant execute on function public.admin_broadcast_notification(text, text, text, text) to authenticated;
