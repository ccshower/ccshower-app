-- Catch-up: colunas usadas pelo workspace financeiro (rodar uma vez no SQL Editor do Supabase)

-- Valor total do projeto
alter table public.ordens_servico
  add column if not exists valor_previsto numeric(12, 2);

-- Decisão financeira
alter table public.ordens_servico
  add column if not exists financial_decision text not null default 'pending',
  add column if not exists financial_rejection_reason text;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_financial_decision_check;

alter table public.ordens_servico
  add constraint ordens_servico_financial_decision_check
  check (financial_decision in ('pending', 'approved', 'rejected'));

-- Captura de pagamento na visita comercial
alter table public.ordens_servico
  add column if not exists visit_payment_received boolean not null default false,
  add column if not exists visit_payment_amount numeric(12, 2),
  add column if not exists visit_payment_method text;

-- Tipos de evento na timeline
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
