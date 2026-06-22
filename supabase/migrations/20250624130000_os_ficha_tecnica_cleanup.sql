-- Enxuga os_ficha_tecnica_items: empresa/unidade vêm da OS (join), não duplicar.

alter table public.os_ficha_tecnica_items
  drop column if exists empresa_id;

create index if not exists idx_os_ficha_tecnica_os_sort
  on public.os_ficha_tecnica_items (ordem_servico_id, sort_order);

comment on table public.os_ficha_tecnica_items is
  'Hardware extraído do PDF de projeto. Tenant/unidade via ordens_servico.';
