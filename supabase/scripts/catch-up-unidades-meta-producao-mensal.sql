-- Run in Supabase SQL Editor to add monthly production goal per unit.

alter table public.unidades
  add column if not exists meta_producao_mensal numeric(12, 2) not null default 250000;

update public.unidades
set meta_producao_mensal = 250000
where meta_producao_mensal is null;

select id, nome, meta_producao_mensal from public.unidades order by nome;
