-- Consistência datetime em agenda_eventos (calendário usa data_inicio)

alter table public.agenda_eventos
  add column if not exists data_inicio timestamptz,
  add column if not exists data_fim timestamptz,
  add column if not exists hora_evento time;

-- Backfill a partir de data_evento legado
update public.agenda_eventos
set
  data_inicio = coalesce(data_inicio, data_evento),
  data_fim = coalesce(
    data_fim,
    data_evento + interval '1 hour'
  ),
  hora_evento = coalesce(
    hora_evento,
    (coalesce(data_inicio, data_evento) at time zone 'America/New_York')::time
  )
where data_inicio is null
   or data_fim is null
   or hora_evento is null;

-- Garantir data_evento quando só data_inicio existe
update public.agenda_eventos
set data_evento = data_inicio
where data_evento is null
  and data_inicio is not null;

-- Sincronizar hora_evento a partir de data_inicio
update public.agenda_eventos
set hora_evento = (data_inicio at time zone 'America/New_York')::time
where data_inicio is not null
  and (
    hora_evento is null
    or hora_evento <> (data_inicio at time zone 'America/New_York')::time
  );

create index if not exists idx_agenda_eventos_data_inicio
  on public.agenda_eventos (data_inicio);
