-- Catch-up: quantidade em catalogo_itens

alter table public.catalogo_itens
  add column if not exists quantidade numeric(12, 3) not null default 0;

comment on column public.catalogo_itens.quantidade is
  'Saldo disponível do insumo. Reserva/baixa automática virá em fase futura.';
