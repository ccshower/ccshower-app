-- Catch-up: ficha técnica extraída do PDF via N8N

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

-- Policies/triggers: aplicar migration completa 20250624120000_os_ficha_tecnica.sql se necessario.
