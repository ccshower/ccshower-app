-- Catch-up: tipo_usuario manager (rodar no SQL Editor do Supabase)

alter table public.usuarios drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check
  check (tipo_usuario in ('comum', 'manager', 'admin'));

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
        u.tipo_usuario in ('admin', 'manager')
        or coalesce(u.pode_ver_todas_equipes, false)
      )
  );
$$;
