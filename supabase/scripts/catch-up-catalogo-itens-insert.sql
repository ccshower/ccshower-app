-- Catch-up: RLS insert/update em catalogo_itens (equipe Projeto)

create or replace function public.can_manage_catalogo_itens()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    left join public.equipes e on e.id = u.equipe_id
    where u.id = auth.uid()
      and u.ativo = true
      and (
        u.tipo_usuario = 'admin'
        or u.pode_gerenciar_estoque = true
        or e.codigo_operacional = 'project'
      )
  );
$$;

grant execute on function public.can_manage_catalogo_itens() to authenticated;

drop policy if exists catalogo_itens_insert on public.catalogo_itens;
create policy catalogo_itens_insert
on public.catalogo_itens
for insert
to authenticated
with check (public.can_manage_catalogo_itens());

drop policy if exists catalogo_itens_update on public.catalogo_itens;
create policy catalogo_itens_update
on public.catalogo_itens
for update
to authenticated
using (public.can_manage_catalogo_itens())
with check (public.can_manage_catalogo_itens());

grant insert, update on public.catalogo_itens to authenticated;
