-- Operacao da OS pela equipe (equipe_atual_id / equipe_id), sem exigir responsavel_id.

drop policy if exists ordens_servico_select on public.ordens_servico;
create policy ordens_servico_select
on public.ordens_servico
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or equipe_atual_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
);

drop policy if exists ordens_servico_insert on public.ordens_servico;
create policy ordens_servico_insert
on public.ordens_servico
for insert
to authenticated
with check (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or equipe_atual_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
);

drop policy if exists ordens_servico_update on public.ordens_servico;
create policy ordens_servico_update
on public.ordens_servico
for update
to authenticated
using (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
  or equipe_id = public.current_equipe_id()
  or equipe_atual_id = public.current_equipe_id()
)
with check (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
  or equipe_id = public.current_equipe_id()
  or equipe_atual_id = public.current_equipe_id()
);

drop policy if exists agenda_eventos_select on public.agenda_eventos;
create policy agenda_eventos_select
on public.agenda_eventos
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
);

drop policy if exists agenda_eventos_update on public.agenda_eventos;
create policy agenda_eventos_update
on public.agenda_eventos
for update
to authenticated
using (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
)
with check (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
);
