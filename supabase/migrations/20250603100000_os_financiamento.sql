-- Financiamento: forma e banco (sem status — bloqueio operacional trata impedimentos).
alter table public.ordens_servico
  add column if not exists forma_pagamento text,
  add column if not exists banco_financiamento text;

comment on column public.ordens_servico.forma_pagamento is
  'Forma de pagamento da venda (ex.: financing, cash, credit_card)';
comment on column public.ordens_servico.banco_financiamento is
  'Banco financiador quando forma_pagamento = financing';
