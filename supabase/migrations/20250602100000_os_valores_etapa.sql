-- Rastreabilidade financeira por etapa (sem sobrescrever valores anteriores).
alter table public.ordens_servico
  add column if not exists valor_comercial numeric(12, 2),
  add column if not exists valor_projeto numeric(12, 2),
  add column if not exists valor_final numeric(12, 2);

comment on column public.ordens_servico.valor_comercial is
  'Valor vendido na visita comercial';
comment on column public.ordens_servico.valor_projeto is
  'Valor revisado na etapa projeto';
comment on column public.ordens_servico.valor_final is
  'Valor final contratado na etapa financeira';
