-- Equipes comerciais (Commercial, SALES, Comercial, etc.)
-- Rode no Supabase → SQL Editor (bloco inteiro)

-- 1) Permite várias equipes com o mesmo codigo_operacional (ex.: Commercial + SALES)
drop index if exists public.idx_equipes_codigo_operacional;

create index if not exists idx_equipes_codigo_operacional
  on public.equipes (codigo_operacional)
  where codigo_operacional is not null;

-- 2) Marca equipes pelo nome
update public.equipes
set codigo_operacional = 'commercial'
where codigo_operacional is null
  and ativo = true
  and (
    lower(nome) like '%commercial%'
    or lower(nome) like '%comercial%'
    or lower(nome) like '%sales%'
    or lower(nome) like '%vendas%'
  );

update public.equipes
set codigo_operacional = 'installation'
where codigo_operacional is null
  and ativo = true
  and lower(nome) like '%install%';

update public.equipes
set codigo_operacional = 'project'
where codigo_operacional is null
  and ativo = true
  and (
    lower(nome) like '%project%'
    or lower(nome) like '%projeto%'
  );

update public.equipes
set codigo_operacional = 'financial_review'
where codigo_operacional is null
  and ativo = true
  and (
    lower(nome) like '%financial%'
    or lower(nome) like '%financeiro%'
  );

-- 3) Cria Commercial genérica só se nenhuma comercial existir
insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, ativo)
select 'Commercial', '#4a6fa5', '#e8f0f7', 'commercial', true
where not exists (
  select 1
  from public.equipes e
  where e.ativo = true
    and (
      e.codigo_operacional = 'commercial'
      or lower(e.nome) like '%commercial%'
      or lower(e.nome) like '%comercial%'
      or lower(e.nome) like '%sales%'
      or lower(e.nome) like '%vendas%'
    )
);

-- 4) Conferir
select id, nome, codigo_operacional, ativo
from public.equipes
order by nome;
