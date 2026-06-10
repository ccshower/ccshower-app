-- Permite listar equipes de outras áreas para selects operacionais (agendamento na OS).
-- Complementa equipes_select_scope (própria equipe / admin) sem expor equipes inativas.

drop policy if exists equipes_select_for_os_scheduling on public.equipes;

create policy equipes_select_for_os_scheduling
on public.equipes
for select
to authenticated
using (
  ativo = true
  and (
    codigo_operacional in (
      'commercial',
      'financial_review',
      'project',
      'installation',
      'comercial',
      'financeiro',
      'projeto',
      'instalacao'
    )
    or lower(nome) like '%instal%'
    or lower(nome) like '%comercial%'
    or lower(nome) like '%financeir%'
    or lower(nome) like '%projeto%'
  )
);
