-- Ficha técnica extraída do PDF de projeto (SHOWER FITTINGS etc.) via N8N

alter table public.os_anexos
  add column if not exists ficha_import_status text,
  add column if not exists ficha_imported_at timestamptz,
  add column if not exists ficha_import_error text;

alter table public.os_anexos
  drop constraint if exists os_anexos_ficha_import_status_check;

alter table public.os_anexos
  add constraint os_anexos_ficha_import_status_check
  check (
    ficha_import_status is null
    or ficha_import_status in (
      'pending',
      'processing',
      'completed',
      'failed',
      'skipped'
    )
  );

comment on column public.os_anexos.ficha_import_status is
  'Pipeline N8N: extração de hardware do PDF de projeto.';

-- ---------------------------------------------------------------------------
-- os_ficha_tecnica_items
-- ---------------------------------------------------------------------------
create table if not exists public.os_ficha_tecnica_items (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null
    references public.ordens_servico (id) on delete cascade,
  os_ambiente_id uuid
    references public.os_ambientes (id) on delete set null,
  os_anexo_id uuid not null
    references public.os_anexos (id) on delete cascade,
  section text not null default 'SHOWER FITTINGS',
  sku text not null,
  quantity numeric(12, 3) not null default 1
    check (quantity > 0),
  glass_spec text,
  finish text,
  notes text,
  sort_order integer not null default 0,
  catalogo_item_id uuid references public.catalogo_itens (id),
  qty_reserved numeric(12, 3) not null default 0 check (qty_reserved >= 0),
  qty_consumed numeric(12, 3) not null default 0 check (qty_consumed >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_os_ficha_tecnica_os
  on public.os_ficha_tecnica_items (ordem_servico_id);

create index if not exists idx_os_ficha_tecnica_os_sort
  on public.os_ficha_tecnica_items (ordem_servico_id, sort_order);

create index if not exists idx_os_ficha_tecnica_anexo
  on public.os_ficha_tecnica_items (os_anexo_id);

create index if not exists idx_os_ficha_tecnica_ambiente
  on public.os_ficha_tecnica_items (os_ambiente_id)
  where os_ambiente_id is not null;

create index if not exists idx_os_ficha_tecnica_sku
  on public.os_ficha_tecnica_items (sku);

create or replace function public.set_os_ficha_tecnica_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_os_ficha_tecnica_atualizado_em
  on public.os_ficha_tecnica_items;

create trigger trg_os_ficha_tecnica_atualizado_em
before update on public.os_ficha_tecnica_items
for each row
execute function public.set_os_ficha_tecnica_atualizado_em();

alter table public.os_ficha_tecnica_items enable row level security;

drop policy if exists os_ficha_tecnica_select on public.os_ficha_tecnica_items;
create policy os_ficha_tecnica_select
on public.os_ficha_tecnica_items
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

drop policy if exists os_ficha_tecnica_insert on public.os_ficha_tecnica_items;
create policy os_ficha_tecnica_insert
on public.os_ficha_tecnica_items
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

drop policy if exists os_ficha_tecnica_update on public.os_ficha_tecnica_items;
create policy os_ficha_tecnica_update
on public.os_ficha_tecnica_items
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

drop policy if exists os_ficha_tecnica_delete on public.os_ficha_tecnica_items;
create policy os_ficha_tecnica_delete
on public.os_ficha_tecnica_items
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
