create or replace function public.admin_ids() returns setof uuid language sql stable security definer set search_path = public as $$ select distinct user_id from public.user_roles where role in ('admin','owner') $$;
revoke all on function public.admin_ids() from public, anon;
grant execute on function public.admin_ids() to authenticated;