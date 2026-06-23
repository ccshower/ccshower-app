-- Etapa install_schedule entre project e installation.

alter table public.ordens_servico drop constraint if exists ordens_servico_etapa_atual_check;
alter table public.ordens_servico
  add constraint ordens_servico_etapa_atual_check
  check (
    etapa_atual in (
      'commercial',
      'financial_review',
      'project',
      'install_schedule',
      'installation',
      'blocked',
      'completed'
    )
  );

alter table public.agenda_eventos drop constraint if exists agenda_eventos_etapa_check;
alter table public.agenda_eventos
  add constraint agenda_eventos_etapa_check
  check (
    etapa in (
      'commercial',
      'financial_review',
      'project',
      'install_schedule',
      'installation',
      'blocked',
      'completed'
    )
  );
