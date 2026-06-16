-- Run in Supabase SQL Editor if Units admin save fails with RLS/permission errors.

drop policy if exists unidades_insert_admin on public.unidades;
create policy unidades_insert_admin
on public.unidades
for insert
to authenticated
with check (public.can_manage_sistema());

drop policy if exists unidades_update_admin on public.unidades;
create policy unidades_update_admin
on public.unidades
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

grant insert, update on public.unidades to authenticated;
