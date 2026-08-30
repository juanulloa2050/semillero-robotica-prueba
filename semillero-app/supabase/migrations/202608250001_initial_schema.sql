create extension if not exists pgcrypto;

create type public.user_role as enum ('candidate', 'evaluator', 'admin');
create type public.run_status as enum ('draft', 'submitted', 'evaluated');
create type public.node_status as enum ('locked', 'available', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'candidate',
  full_name text not null default '',
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  program text not null default '',
  semester text not null default '',
  cumulative_average text not null default '',
  student_code text,
  github text not null default '',
  linkedin text not null default '',
  portfolio text not null default '',
  website text not null default '',
  instagram text not null default '',
  consent_data boolean not null default false,
  consent_files boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index candidate_student_code_unique
  on public.candidate_profiles (lower(student_code))
  where student_code is not null and student_code <> '';

create table public.assessment_runs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  status public.run_status not null default 'draft',
  schema_version integer not null default 3,
  snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  evaluated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(candidate_id)
);

create table public.node_progress (
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  node_id text not null,
  status public.node_status not null default 'available',
  score_auto numeric,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (run_id, node_id)
);

create table public.step_progress (
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  node_id text not null,
  step_id text not null,
  draft jsonb not null default 'null'::jsonb,
  hints_used integer not null default 0 check (hints_used >= 0),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  solved_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (run_id, node_id, step_id)
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  node_id text not null,
  step_id text not null,
  attempt_number integer not null check (attempt_number > 0),
  answer jsonb not null,
  is_correct boolean,
  score numeric,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique(run_id, node_id, step_id, attempt_number)
);

create table public.introductions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  kind text not null check (kind in ('text','image','audio','video','file','link')),
  title text not null,
  content text,
  storage_path text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check ((content is not null) or (storage_path is not null))
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  node_id text not null,
  field_id text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  sha256 text,
  created_at timestamptz not null default now()
);

create table public.evaluator_assignments (
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (run_id, evaluator_id)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.assessment_runs(id) on delete cascade,
  node_id text not null,
  evaluator_id uuid not null references public.profiles(id) on delete restrict,
  criterion text not null,
  score numeric not null check (score >= 0 and score <= 100),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, node_id, evaluator_id, criterion)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.can_read_run(target_run uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.assessment_runs r
    where r.id = target_run and (
      r.candidate_id = auth.uid()
      or public.current_role() = 'admin'
      or exists (
        select 1 from public.evaluator_assignments ea
        where ea.run_id = r.id and ea.evaluator_id = auth.uid()
      )
    )
  )
$$;

create or replace function public.can_write_run(target_run uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.assessment_runs r
    where r.id = target_run and r.candidate_id = auth.uid() and r.status = 'draft'
  )
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, email, full_name)
  values(new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.candidate_profiles(user_id) values(new.id);
  insert into public.assessment_runs(candidate_id) values(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.assessment_runs enable row level security;
alter table public.node_progress enable row level security;
alter table public.step_progress enable row level security;
alter table public.attempts enable row level security;
alter table public.introductions enable row level security;
alter table public.evidence_files enable row level security;
alter table public.evaluator_assignments enable row level security;
alter table public.evaluations enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.current_role() = 'admin' or exists (
  select 1 from public.assessment_runs r join public.evaluator_assignments ea on ea.run_id = r.id
  where r.candidate_id = profiles.id and ea.evaluator_id = auth.uid()
));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = auth.uid() and exists (
  select 1 from public.assessment_runs r where r.candidate_id = auth.uid() and r.status = 'draft'
)) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;

create policy candidate_profiles_select on public.candidate_profiles for select to authenticated
using (user_id = auth.uid() or public.current_role() = 'admin' or exists (
  select 1 from public.assessment_runs r join public.evaluator_assignments ea on ea.run_id = r.id
  where r.candidate_id = candidate_profiles.user_id and ea.evaluator_id = auth.uid()
));
create policy candidate_profiles_update_self on public.candidate_profiles for update to authenticated
using (user_id = auth.uid() and exists (
  select 1 from public.assessment_runs r where r.candidate_id = auth.uid() and r.status = 'draft'
)) with check (user_id = auth.uid());

create policy runs_select on public.assessment_runs for select to authenticated
using (public.can_read_run(id));
create policy runs_update_candidate on public.assessment_runs for update to authenticated
using (candidate_id = auth.uid() and status = 'draft')
with check (candidate_id = auth.uid() and status in ('draft','submitted'));

create policy node_progress_select on public.node_progress for select to authenticated using (public.can_read_run(run_id));
create policy node_progress_insert on public.node_progress for insert to authenticated with check (public.can_write_run(run_id));
create policy node_progress_update on public.node_progress for update to authenticated using (public.can_write_run(run_id));
create policy step_progress_select on public.step_progress for select to authenticated using (public.can_read_run(run_id));
create policy step_progress_insert on public.step_progress for insert to authenticated with check (public.can_write_run(run_id));
create policy step_progress_update on public.step_progress for update to authenticated using (public.can_write_run(run_id));
create policy attempts_select on public.attempts for select to authenticated using (public.can_read_run(run_id));
create policy attempts_insert on public.attempts for insert to authenticated with check (public.can_write_run(run_id));
create policy introductions_select on public.introductions for select to authenticated using (public.can_read_run(run_id));
create policy introductions_write on public.introductions for all to authenticated using (public.can_write_run(run_id)) with check (public.can_write_run(run_id));
create policy evidence_select on public.evidence_files for select to authenticated using (public.can_read_run(run_id));
create policy evidence_write on public.evidence_files for all to authenticated using (public.can_write_run(run_id)) with check (public.can_write_run(run_id));

create policy assignments_select on public.evaluator_assignments for select to authenticated
using (evaluator_id = auth.uid() or public.current_role() = 'admin');
create policy assignments_admin on public.evaluator_assignments for all to authenticated
using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy evaluations_select on public.evaluations for select to authenticated using (public.can_read_run(run_id));
create policy evaluations_insert on public.evaluations for insert to authenticated
with check (
  public.current_role() = 'admin'
  or (evaluator_id = auth.uid() and exists (
    select 1 from public.evaluator_assignments ea where ea.run_id = evaluations.run_id and ea.evaluator_id = auth.uid()
  ))
);
create policy evaluations_update on public.evaluations for update to authenticated
using (evaluator_id = auth.uid()) with check (evaluator_id = auth.uid());
create policy audit_admin_select on public.audit_events for select to authenticated
using (public.current_role() = 'admin');

insert into storage.buckets(id, name, public, file_size_limit)
values ('evidence', 'evidence', false, 52428800)
on conflict (id) do nothing;

create policy storage_candidate_insert on storage.objects for insert to authenticated
with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_owner_read on storage.objects for select to authenticated
using (bucket_id = 'evidence' and (
  (storage.foldername(name))[1] = auth.uid()::text
  or exists (
    select 1 from public.evidence_files ef
    where ef.storage_path = name and public.can_read_run(ef.run_id)
  )
  or exists (
    select 1 from public.introductions intro
    where intro.storage_path = name and public.can_read_run(intro.run_id)
  )
));
create policy storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
