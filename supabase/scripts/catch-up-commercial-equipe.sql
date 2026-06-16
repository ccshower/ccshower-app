-- Garante pelo menos uma equipe comercial para cadastro de clientes
-- Rode no Supabase → SQL Editor

-- Marca equipes existentes pelo nome (quando codigo_operacional ainda é null)
update public.equipes
set codigo_operacional = 'commercial'
where codigo_operacional is null
  and ativo = true
  and (
    lower(nome) like '%commercial%'
    or lower(nome) like '%comercial%'
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

-- Cria equipe Commercial se nenhuma ativa servir a etapa commercial
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
    )
);

-- Conferir
select id, nome, codigo_operacional, ativo
from public.equipes
order by nome;
