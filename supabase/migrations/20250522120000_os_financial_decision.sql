-- Decisão operacional da etapa financeira (não substitui ERP)

alter table public.ordens_servico
  add column if not exists financial_decision text not null default 'pending',
  add column if not exists financial_rejection_reason text;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_financial_decision_check;

alter table public.ordens_servico
  add constraint ordens_servico_financial_decision_check
  check (financial_decision in ('pending', 'approved', 'rejected'));

-- Eventos de timeline: aprovação / reprovação financeira
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
      'other'
    )
  );
