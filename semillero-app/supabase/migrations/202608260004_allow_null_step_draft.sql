-- Los retos de terminal registran intentos sin necesitar un borrador textual.
-- PostgREST convierte el null JSON enviado por supabase-js en SQL NULL, por
-- lo que la restriccion NOT NULL interrumpia toda la sincronizacion remota.

alter table public.step_progress
  alter column draft drop not null;
