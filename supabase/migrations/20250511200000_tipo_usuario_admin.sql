-- Migração: modelo oficial tipo_usuario = admin (antes: gerente).
-- Idempotente o suficiente para ambientes já existentes.

update public.usuarios
set tipo_usuario = 'admin'
where tipo_usuario = 'gerente';

alter table public.usuarios drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check
  check (tipo_usuario in ('comum', 'admin'));

create or replace function public.can_manage_sistema()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.ativo, true)
      and u.tipo_usuario = 'admin'
  );
$$;

create or replace function public.can_view_all_equipes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.ativo, true)
      and (
        u.tipo_usuario = 'admin'
        or coalesce(u.pode_ver_todas_equipes, false)
      )
  );
$$;

drop policy if exists equipes_insert_gerente on public.equipes;
drop policy if exists equipes_update_gerente on public.equipes;
drop policy if exists equipes_insert_admin on public.equipes;
drop policy if exists equipes_update_admin on public.equipes;

create policy equipes_insert_admin
on public.equipes
for insert
to authenticated
with check (public.can_manage_sistema());

create policy equipes_update_admin
on public.equipes
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

drop policy if exists usuarios_update_gerente on public.usuarios;
drop policy if exists usuarios_insert_gerente on public.usuarios;
drop policy if exists usuarios_update_admin on public.usuarios;
drop policy if exists usuarios_insert_admin on public.usuarios;

create policy usuarios_update_admin
on public.usuarios
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

create policy usuarios_insert_admin
on public.usuarios
for insert
to authenticated
with check (public.can_manage_sistema());
