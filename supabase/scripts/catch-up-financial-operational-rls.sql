-- Catch-up: RLS operacional da equipe financeira (rodar no SQL Editor do Supabase)
-- Arquivo espelho: supabase/migrations/20250609100000_financial_operational_rls.sql

create or replace function public.user_equipe_is_financial_review()
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
      and coalesce(e.ativo, true)
      and e.codigo_operacional in ('financial_review', 'financeiro')
  );
$$;

grant execute on function public.user_equipe_is_financial_review() to authenticated;

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
);
