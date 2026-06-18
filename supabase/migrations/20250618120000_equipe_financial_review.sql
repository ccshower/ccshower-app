-- Financial team for financial_review stage (Centro Operacional queue + workflow routing).

do $$
declare
  v_jax uuid;
begin
  select id into v_jax from public.unidades where matriz = true limit 1;

  insert into public.equipes (nome, cor_primaria, cor_secundaria, codigo_operacional, unidade_id, ativo)
  select 'Financial', '#059669', '#D1FAE5', 'financial_review', v_jax, true
  where not exists (
    select 1
    from public.equipes e
    where e.ativo = true
      and e.codigo_operacional = 'financial_review'
  );

  update public.equipes
  set
    cor_primaria = '#059669',
    cor_secundaria = '#D1FAE5',
    codigo_operacional = 'financial_review',
    unidade_id = coalesce(unidade_id, v_jax),
    ativo = true
  where lower(nome) in ('financial', 'financeiro', 'back office')
    and (
      codigo_operacional is null
      or codigo_operacional is distinct from 'financial_review'
    );
end $$;
