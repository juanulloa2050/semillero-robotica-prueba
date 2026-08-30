-- PostgreSQL concede EXECUTE sobre funciones nuevas a PUBLIC por defecto.
-- Estas funciones participan en RLS o realizan operaciones privilegiadas, así
-- que se cierran al rol anónimo y se conceden sólo donde son necesarias.

revoke execute on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

revoke execute on function public.can_read_run(uuid) from public, anon;
grant execute on function public.can_read_run(uuid) to authenticated;

revoke execute on function public.can_write_run(uuid) from public, anon;
grant execute on function public.can_write_run(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.mark_run_evaluated(uuid) from public, anon;
grant execute on function public.mark_run_evaluated(uuid) to authenticated;

revoke execute on function public.admin_set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
