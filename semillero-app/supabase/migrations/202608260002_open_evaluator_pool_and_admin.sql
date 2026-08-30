-- Evaluadores trabajan desde un banco común de recorridos. La tabla histórica
-- evaluator_assignments se conserva para no romper datos existentes, pero ya no
-- participa en autorización ni en la interfaz.

create or replace function public.can_read_run(target_run uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.assessment_runs r
    where r.id = target_run
      and (
        r.candidate_id = auth.uid()
        or public.current_role() in ('evaluator', 'admin')
      )
  )
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.current_role() in ('evaluator', 'admin')
);

drop policy if exists candidate_profiles_select on public.candidate_profiles;
create policy candidate_profiles_select on public.candidate_profiles for select to authenticated
using (
  user_id = auth.uid()
  or public.current_role() in ('evaluator', 'admin')
);

drop policy if exists evaluations_insert on public.evaluations;
create policy evaluations_insert on public.evaluations for insert to authenticated
with check (
  public.current_role() = 'admin'
  or (
    public.current_role() = 'evaluator'
    and evaluator_id = auth.uid()
    and exists (
      select 1
      from public.assessment_runs r
      where r.id = evaluations.run_id
        and r.status in ('submitted', 'evaluated')
    )
  )
);

drop policy if exists evaluations_update on public.evaluations;
create policy evaluations_update on public.evaluations for update to authenticated
using (
  public.current_role() = 'admin'
  or evaluator_id = auth.uid()
)
with check (
  public.current_role() = 'admin'
  or evaluator_id = auth.uid()
);

create or replace function public.mark_run_evaluated(target_run uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_role() not in ('evaluator', 'admin') then
    raise exception 'No tienes permiso para cerrar esta evaluación.';
  end if;

  if not exists (
    select 1 from public.assessment_runs
    where id = target_run and status in ('submitted', 'evaluated')
  ) then
    raise exception 'El recorrido todavía no ha sido enviado.';
  end if;

  update public.assessment_runs
  set status = 'evaluated', evaluated_at = coalesce(evaluated_at, now()), updated_at = now()
  where id = target_run;

  insert into public.audit_events(actor_id, action, entity_type, entity_id)
  values(auth.uid(), 'run_evaluated', 'assessment_run', target_run::text);
end;
$$;

grant execute on function public.mark_run_evaluated(uuid) to authenticated;

create or replace function public.admin_set_user_role(target_user uuid, next_role public.user_role)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  previous_role public.user_role;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Sólo un administrador puede cambiar roles.';
  end if;

  if target_user = auth.uid() and next_role <> 'admin' then
    raise exception 'No puedes retirar tu propio rol de administrador.';
  end if;

  select role into previous_role from public.profiles where id = target_user;
  if previous_role is null then
    raise exception 'La cuenta indicada no existe.';
  end if;

  update public.profiles
  set role = next_role, updated_at = now()
  where id = target_user;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values(
    auth.uid(),
    'role_changed',
    'profile',
    target_user::text,
    jsonb_build_object('previous_role', previous_role, 'next_role', next_role)
  );
end;
$$;

grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;
