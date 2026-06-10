-- Lista de separação da OS (Projeto → Estoque → Instalação)

alter table public.ordens_servico
  add column if not exists installation_notes text;

-- ---------------------------------------------------------------------------
-- os_separation_list_items — itens da instalação
-- ---------------------------------------------------------------------------
create table if not exists public.os_separation_list_items (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null
    references public.ordens_servico (id) on delete cascade,
  empresa_id uuid,
  item_description text not null,
  quantity numeric(12, 3) not null default 1
    check (quantity > 0),
  notes text,
  sort_order integer not null default 0,
  -- pipeline estoque (futuro — não expor na UI v1)
  qty_reserved numeric(12, 3) not null default 0 check (qty_reserved >= 0),
  qty_separated numeric(12, 3) not null default 0 check (qty_separated >= 0),
  qty_checked numeric(12, 3) not null default 0 check (qty_checked >= 0),
  qty_consumed numeric(12, 3) not null default 0 check (qty_consumed >= 0),
  criado_por uuid references public.usuarios (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_os_separation_list_os
  on public.os_separation_list_items (ordem_servico_id);

create index if not exists idx_os_separation_list_empresa
  on public.os_separation_list_items (empresa_id);

create index if not exists idx_os_separation_list_sort
  on public.os_separation_list_items (ordem_servico_id, sort_order);

create or replace function public.set_os_separation_list_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_os_separation_list_atualizado_em
  on public.os_separation_list_items;

create trigger trg_os_separation_list_atualizado_em
before update on public.os_separation_list_items
for each row
execute function public.set_os_separation_list_atualizado_em();

alter table public.os_separation_list_items enable row level security;

drop policy if exists os_separation_list_select on public.os_separation_list_items;
create policy os_separation_list_select
on public.os_separation_list_items
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

drop policy if exists os_separation_list_insert on public.os_separation_list_items;
create policy os_separation_list_insert
on public.os_separation_list_items
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

drop policy if exists os_separation_list_update on public.os_separation_list_items;
create policy os_separation_list_update
on public.os_separation_list_items
for update
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);

drop policy if exists os_separation_list_delete on public.os_separation_list_items;
create policy os_separation_list_delete
on public.os_separation_list_items
for delete
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);

-- Anexo CNC (Projeto)
alter table public.os_anexos
  drop constraint if exists os_anexos_tipo_check;

alter table public.os_anexos
  add constraint os_anexos_tipo_check
  check (
    tipo in (
      'technical_visit',
      'payment_receipt',
      'measurement',
      'installation',
      'cnc_file',
      'other'
    )
  );

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/octet-stream'
  ]
where id = 'os-anexos';
