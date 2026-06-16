-- Comercial/SALES: ver OS na etapa commercial de qualquer equipe comercial da mesma unidade
-- Rode no Supabase → SQL Editor (bloco inteiro)

create or replace function public.current_unidade_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.unidade_id
  from public.usuarios u
  where u.id = auth.uid()
    and coalesce(u.ativo, true)
  limit 1;
$$;

grant execute on function public.current_unidade_id() to authenticated;

create or replace function public.equipe_is_commercial_stage(e public.equipes)
returns boolean
language sql
stable
as $$
  select coalesce(e.ativo, true)
    and (
      e.codigo_operacional = 'commercial'
      or lower(coalesce(e.nome, '')) like '%commercial%'
      or lower(coalesce(e.nome, '')) like '%comercial%'
      or lower(coalesce(e.nome, '')) like '%sales%'
      or lower(coalesce(e.nome, '')) like '%vendas%'
    );
$$;

create or replace function public.user_equipe_is_commercial_stage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    join public.equipes e on e.id = u.equipe_id
    where u.id = auth.uid()
      and coalesce(u.ativo, true)
      and public.equipe_is_commercial_stage(e)
  );
$$;

grant execute on function public.user_equipe_is_commercial_stage() to authenticated;

drop policy if exists ordens_servico_select on public.ordens_servico;
create policy ordens_servico_select
on public.ordens_servico
for select
to authenticated
using (
  public.can_view_all_equipes()
  or public.user_equipe_is_financial_review()
  or equipe_id = public.current_equipe_id()
  or equipe_atual_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
  or (
    public.user_equipe_is_commercial_stage()
    and etapa_atual = 'commercial'
    and exists (
      select 1
      from public.equipes e
      where e.id = coalesce(ordens_servico.equipe_atual_id, ordens_servico.equipe_id)
        and public.equipe_is_commercial_stage(e)
        and (
          e.unidade_id is null
          or public.current_unidade_id() is null
          or e.unidade_id = public.current_unidade_id()
        )
    )
  )
);

drop policy if exists clientes_select_scope on public.clientes;
create policy clientes_select_scope
on public.clientes
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or criado_por = auth.uid()
  or (
    public.user_equipe_is_financial_review()
    and exists (
      select 1
      from public.ordens_servico os
      where os.cliente_id = clientes.id
        and coalesce(os.ativo, true)
    )
  )
  or (
    public.user_equipe_is_commercial_stage()
    and exists (
      select 1
      from public.ordens_servico os
      join public.equipes e
        on e.id = coalesce(os.equipe_atual_id, os.equipe_id)
      where os.cliente_id = clientes.id
        and coalesce(os.ativo, true)
        and os.etapa_atual = 'commercial'
        and public.equipe_is_commercial_stage(e)
        and (
          e.unidade_id is null
          or public.current_unidade_id() is null
          or e.unidade_id = public.current_unidade_id()
        )
    )
  )
);
