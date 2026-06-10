alter table public.ordens_servico
  add column if not exists forma_pagamento text,
  add column if not exists banco_financiamento text;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_status_financiamento_check;

alter table public.ordens_servico
  drop column if exists status_financiamento;
