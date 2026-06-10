-- Anexos da OS + anotacoes tecnicas (visita comercial)

alter table public.ordens_servico
  add column if not exists anotacoes_tecnicas text;

-- ---------------------------------------------------------------------------
-- os_anexos
-- ---------------------------------------------------------------------------
create table if not exists public.os_anexos (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  tipo text not null default 'technical_visit'
    check (tipo in ('technical_visit', 'measurement', 'installation', 'other')),
  storage_path text not null,
  nome_arquivo text not null,
  mime_type text not null,
  tamanho_bytes bigint not null default 0,
  criado_por uuid references public.usuarios (id),
  criado_em timestamptz not null default now()
);

create index if not exists idx_os_anexos_os on public.os_anexos (ordem_servico_id);
create index if not exists idx_os_anexos_tipo on public.os_anexos (tipo);
create index if not exists idx_os_anexos_criado_em on public.os_anexos (criado_em);

alter table public.os_anexos enable row level security;

drop policy if exists os_anexos_select on public.os_anexos;
create policy os_anexos_select
on public.os_anexos
for select
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
    )
  )
);

drop policy if exists os_anexos_insert on public.os_anexos;
create policy os_anexos_insert
on public.os_anexos
for insert
to authenticated
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);

drop policy if exists os_anexos_delete on public.os_anexos;
create policy os_anexos_delete
on public.os_anexos
for delete
to authenticated
using (
  criado_por = auth.uid()
  or public.can_manage_sistema()
);

-- Storage bucket (privado; URLs assinadas no app)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'os-anexos',
  'os-anexos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists os_anexos_storage_select on storage.objects;
create policy os_anexos_storage_select
on storage.objects
for select
to authenticated
using (bucket_id = 'os-anexos');

drop policy if exists os_anexos_storage_insert on storage.objects;
create policy os_anexos_storage_insert
on storage.objects
for insert
to authenticated
with check (bucket_id = 'os-anexos');

drop policy if exists os_anexos_storage_delete on storage.objects;
create policy os_anexos_storage_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'os-anexos');
