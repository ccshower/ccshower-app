-- Ver cliente quando o usuário já pode ver alguma OS ativa vinculada (filas do centro operacional).

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
  or exists (
    select 1
    from public.ordens_servico os
    where os.cliente_id = clientes.id
      and coalesce(os.ativo, true)
      and (
        public.can_view_all_equipes()
        or public.user_equipe_is_financial_review()
        or os.equipe_id = public.current_equipe_id()
        or os.equipe_atual_id = public.current_equipe_id()
        or os.responsavel_id = auth.uid()
        or os.criado_por = auth.uid()
        or (
          public.user_equipe_is_commercial_stage()
          and os.etapa_atual = 'commercial'
          and exists (
            select 1
            from public.equipes e
            where e.id = coalesce(os.equipe_atual_id, os.equipe_id)
              and public.equipe_is_commercial_stage(e)
              and (
                e.unidade_id is null
                or public.current_unidade_id() is null
                or e.unidade_id = public.current_unidade_id()
              )
          )
        )
      )
  )
);
