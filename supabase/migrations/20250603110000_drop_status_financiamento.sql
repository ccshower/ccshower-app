-- Remove status_financiamento (regra revisada: bloqueio operacional é a fonte oficial).
alter table public.ordens_servico
  drop constraint if exists ordens_servico_status_financiamento_check;

alter table public.ordens_servico
  drop column if exists status_financiamento;
