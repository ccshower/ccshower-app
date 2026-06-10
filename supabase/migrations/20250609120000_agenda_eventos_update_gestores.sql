-- Reagendamento no calendário: quem vê todas as equipes também pode atualizar eventos.

drop policy if exists agenda_eventos_update on public.agenda_eventos;
create policy agenda_eventos_update
on public.agenda_eventos
for update
to authenticated
using (
  public.can_manage_sistema()
  or public.can_view_all_equipes()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
)
with check (
  public.can_manage_sistema()
  or public.can_view_all_equipes()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
);
