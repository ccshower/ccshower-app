-- Maquina de estados: etapas bloqueado/concluida, equipe padrao por codigo, auditoria mudanca_etapa

alter table public.equipes
  add column if not exists codigo_operacional text;

create unique index if not exists idx_equipes_codigo_operacional
  on public.equipes (codigo_operacional)
  where codigo_operacional is not null;

alter table public.equipes
  drop constraint if exists equipes_codigo_operacional_check;

alter table public.equipes
  add constraint equipes_codigo_operacional_check
  check (
    codigo_operacional is null
    or codigo_operacional in ('comercial', 'financeiro', 'projeto', 'instalacao')
  );

-- ordens_servico.etapa_atual
alter table public.ordens_servico
  drop constraint if exists ordens_servico_etapa_atual_check;

alter table public.ordens_servico
  add constraint ordens_servico_etapa_atual_check
  check (
    etapa_atual in (
      'comercial',
      'financeiro',
      'projeto',
      'instalacao',
      'bloqueado',
      'concluida'
    )
  );

-- agenda_eventos.etapa
alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_etapa_check;

alter table public.agenda_eventos
  add constraint agenda_eventos_etapa_check
  check (
    etapa in (
      'comercial',
      'financeiro',
      'projeto',
      'instalacao',
      'bloqueado',
      'concluida'
    )
  );

-- agenda_eventos.tipo_evento — auditoria de mudanca de etapa
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
      'outro'
    )
  );
