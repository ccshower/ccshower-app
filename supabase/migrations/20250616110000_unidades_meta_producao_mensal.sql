-- Monthly production goal per unit (Operational Center card)

alter table public.unidades
  add column if not exists meta_producao_mensal numeric(12, 2) not null default 250000;

update public.unidades
set meta_producao_mensal = 250000
where meta_producao_mensal is null;
