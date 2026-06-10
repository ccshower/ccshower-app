-- Garante coluna de valor do projeto (pode faltar em bases parciais)

alter table public.ordens_servico
  add column if not exists valor_previsto numeric(12, 2);
