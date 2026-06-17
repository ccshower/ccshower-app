-- Client team setup (CC Shower) — run in Supabase SQL Editor after confirming units exist.
-- Safe to re-run: updates by team name, inserts only when missing.
--
-- Operational stages: commercial | financial_review | project | installation
-- Reparos: no stage (not used in workflow yet).

-- ---------------------------------------------------------------------------
-- Helpers: unit ids
-- ---------------------------------------------------------------------------
-- Jacksonville = HQ (matriz), Orlando = second unit

do $$
declare
  v_jax uuid;
  v_orl uuid;
begin
  select id into v_jax from public.unidades where matriz = true limit 1;
  select id into v_orl from public.unidades where nome = 'Orlando' limit 1;

  -- Commercial
  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Sales', '#94A3B8', '#E2E8F0', 'commercial', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Sales'));

  update public.equipes
  set cor_primaria = '#94A3B8', cor_secundaria = '#E2E8F0', codigo_operacional = 'commercial',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Sales');

  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Sales Orlando', '#475569', '#CBD5E1', 'commercial', v_orl, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Sales Orlando'));

  update public.equipes
  set cor_primaria = '#475569', cor_secundaria = '#CBD5E1', codigo_operacional = 'commercial',
      unidade_id = coalesce(unidade_id, v_orl), ativo = true
  where lower(nome) = lower('Sales Orlando');

  -- Project
  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Design & Projects', '#0F766E', '#CCFBF1', 'project', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Design & Projects'));

  update public.equipes
  set cor_primaria = '#0F766E', cor_secundaria = '#CCFBF1', codigo_operacional = 'project',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Design & Projects');

  -- Installation
  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Install 1', '#F97316', '#FFEDD5', 'installation', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Install 1'));

  update public.equipes
  set cor_primaria = '#F97316', cor_secundaria = '#FFEDD5', codigo_operacional = 'installation',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Install 1');

  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Install 2', '#2563EB', '#DBEAFE', 'installation', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Install 2'));

  update public.equipes
  set cor_primaria = '#2563EB', cor_secundaria = '#DBEAFE', codigo_operacional = 'installation',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Install 2');

  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Install 3', '#DC2626', '#FEE2E2', 'installation', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Install 3'));

  update public.equipes
  set cor_primaria = '#DC2626', cor_secundaria = '#FEE2E2', codigo_operacional = 'installation',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Install 3');

  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Install Manager', '#EAB308', '#FEF9C3', 'installation', v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Install Manager'));

  update public.equipes
  set cor_primaria = '#EAB308', cor_secundaria = '#FEF9C3', codigo_operacional = 'installation',
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Install Manager');

  -- Repairs: registered for colors only — no operational stage yet
  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Reparos', '#7C3AED', '#EDE9FE', null, v_jax, true
  where not exists (select 1 from public.equipes e where lower(e.nome) = lower('Reparos'));

  update public.equipes
  set cor_primaria = '#7C3AED', cor_secundaria = '#EDE9FE', codigo_operacional = null,
      unidade_id = coalesce(unidade_id, v_jax), ativo = true
  where lower(nome) = lower('Reparos');
end $$;

-- Review
select
  e.nome,
  e.codigo_operacional as operational_stage,
  u.nome as unidade,
  e.cor_primaria,
  e.ativo
from public.equipes e
left join public.unidades u on u.id = e.unidade_id
where e.ativo = true
order by e.codigo_operacional nulls last, e.nome;
