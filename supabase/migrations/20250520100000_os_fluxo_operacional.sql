-- Fluxo operacional: OS + visita criados em conjunto (sem trigger duplicado)

alter table public.ordens_servico
  add column if not exists observacoes text;

drop trigger if exists trg_ordem_servico_evento_inicial on public.ordens_servico;
drop function if exists public.criar_evento_inicial_ordem_servico();
