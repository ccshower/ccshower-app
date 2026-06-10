-- Captura operacional de pagamento na visita comercial (não substitui módulo financeiro)

alter table public.ordens_servico
  add column if not exists visit_payment_received boolean not null default false,
  add column if not exists visit_payment_amount numeric(12, 2),
  add column if not exists visit_payment_method text,
  add column if not exists visit_payment_notes text;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_visit_payment_method_check;

alter table public.ordens_servico
  add constraint ordens_servico_visit_payment_method_check
  check (
    visit_payment_method is null
    or visit_payment_method in (
      'cash',
      'check',
      'debit_card',
      'credit_card',
      'zelle'
    )
  );

-- Comprovante de pagamento em os_anexos
alter table public.os_anexos
  drop constraint if exists os_anexos_tipo_check;

alter table public.os_anexos
  add constraint os_anexos_tipo_check
  check (
    tipo in (
      'technical_visit',
      'payment_receipt',
      'measurement',
      'installation',
      'other'
    )
  );

-- PDF + imagens no bucket de anexos
update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/gif',
    'application/pdf'
  ]
where id = 'os-anexos';
