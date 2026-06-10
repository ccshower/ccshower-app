-- Catch-up: tipo_evento project_completed

alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_tipo_evento_check;

alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_evento_check
  check (
    tipo_evento in (
      'technical_visit',
      'measurement',
      'installation',
      'stage_changed',
      'status_changed',
      'os_created',
      'financial_approved',
      'financial_rejected',
      'project_completed',
      'other'
    )
  );
