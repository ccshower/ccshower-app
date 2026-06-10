-- Workspace operacional da etapa Instalação

alter table public.ordens_servico
  add column if not exists installation_execution_notes text,
  add column if not exists installation_payment_received boolean not null default false,
  add column if not exists installation_payment_amount numeric(12, 2),
  add column if not exists installation_payment_method text,
  add column if not exists installation_payment_notes text,
  add column if not exists installation_balance_pending_acknowledged boolean not null default false;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_installation_payment_method_check;

alter table public.ordens_servico
  add constraint ordens_servico_installation_payment_method_check
  check (
    installation_payment_method is null
    or installation_payment_method in (
      'cash',
      'check',
      'debit_card',
      'credit_card',
      'zelle'
    )
  );

-- Comprovante de pagamento na instalação
alter table public.os_anexos
  drop constraint if exists os_anexos_tipo_check;

alter table public.os_anexos
  add constraint os_anexos_tipo_check
  check (
    tipo in (
      'technical_visit',
      'payment_receipt',
      'installation_payment_receipt',
      'measurement',
      'installation',
      'cnc_file',
      'other'
    )
  );

-- Evento installation_completed na timeline
alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_tipo_evento_check;

alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_evento_check
  check (
    tipo_evento in (
      'technical_visit',
      'measurement',
      'installation',
      'installation_completed',
      'stage_changed',
      'status_changed',
      'os_created',
      'financial_approved',
      'financial_rejected',
      'project_completed',
      'other'
    )
  );
