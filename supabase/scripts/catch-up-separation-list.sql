-- Catch-up: lista de separação + CNC (rodar no SQL Editor se migration não aplicada)

alter table public.ordens_servico
  add column if not exists installation_notes text;

create table if not exists public.os_separation_list_items (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null
    references public.ordens_servico (id) on delete cascade,
  empresa_id uuid,
  item_description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  notes text,
  sort_order integer not null default 0,
  qty_reserved numeric(12, 3) not null default 0 check (qty_reserved >= 0),
  qty_separated numeric(12, 3) not null default 0 check (qty_separated >= 0),
  qty_checked numeric(12, 3) not null default 0 check (qty_checked >= 0),
  qty_consumed numeric(12, 3) not null default 0 check (qty_consumed >= 0),
  criado_por uuid references public.usuarios (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

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
