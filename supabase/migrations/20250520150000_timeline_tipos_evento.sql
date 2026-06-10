-- Tipos de evento para timeline operacional / auditoria

alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_tipo_evento_check;

alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_evento_check
  check (
    tipo_evento in (
      'visita_tecnica',
      'medicao',
      'instalacao',
      'mudanca_etapa',
      'mudanca_status',
      'os_criada',
      'outro'
    )
  );
