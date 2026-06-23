-- Permite equipe comercial atualizar cliente durante visita (ex.: corrigir nome).

create or replace function public.cliente_em_visita_comercial_editavel(c_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ordens_servico os
    join public.equipes e
      on e.id = coalesce(os.equipe_atual_id, os.equipe_id)
    where os.cliente_id = c_id
      and coalesce(os.ativo, true)
      and os.etapa_atual = 'commercial'
      and os.status_atual in ('visit_scheduled', 'visit_in_progress')
      and public.equipe_is_commercial_stage(e)
      and (
        public.can_view_all_equipes()
        or public.can_manage_sistema()
        or os.responsavel_id = auth.uid()
        or os.criado_por = auth.uid()
        or e.id = public.current_equipe_id()
        or (
          public.user_equipe_is_commercial_stage()
          and (
            e.unidade_id is null
            or public.current_unidade_id() is null
            or e.unidade_id = public.current_unidade_id()
          )
        )
      )
  );
$$;

grant execute on function public.cliente_em_visita_comercial_editavel(uuid) to authenticated;

drop policy if exists clientes_update_visita_comercial on public.clientes;
create policy clientes_update_visita_comercial
on public.clientes
for update
to authenticated
using (public.cliente_em_visita_comercial_editavel(id))
with check (public.cliente_em_visita_comercial_editavel(id));
