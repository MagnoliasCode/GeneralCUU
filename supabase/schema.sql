-- Ejecuta esto en Supabase Dashboard > SQL Editor (una sola vez, en tu proyecto nuevo).

create table if not exists public.assignments (
  doc_id text primary key,
  layer text not null,
  territory_id text not null,
  label text,
  responsable text default '' not null,
  prioritario boolean default false not null,
  pendiente boolean default false not null,
  updated_at timestamptz,
  updated_by text
);

create index if not exists assignments_layer_idx on public.assignments (layer);

alter table public.assignments enable row level security;

-- Cualquier usuario autenticado (login gestionado por el admin, ver README) puede leer.
create policy "assignments_select_authenticated"
  on public.assignments for select
  to authenticated
  using (true);

-- Cualquier usuario autenticado puede crear/actualizar asignaciones (un solo rol, sin jerarquía).
create policy "assignments_upsert_authenticated"
  on public.assignments for insert
  to authenticated
  with check (true);

create policy "assignments_update_authenticated"
  on public.assignments for update
  to authenticated
  using (true)
  with check (true);

-- Habilita Realtime (cambios en vivo) para esta tabla.
alter publication supabase_realtime add table public.assignments;
