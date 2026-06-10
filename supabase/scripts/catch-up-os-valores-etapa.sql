alter table public.ordens_servico
  add column if not exists valor_comercial numeric(12, 2),
  add column if not exists valor_projeto numeric(12, 2),
  add column if not exists valor_final numeric(12, 2);
