-- Desconto administrativo na OS (subtrai do valor total até o fim do fluxo).

alter table public.ordens_servico
  add column if not exists desconto_valor numeric(12, 2);

alter table public.ordens_servico
  add column if not exists desconto_justificativa text;

alter table public.ordens_servico
  add column if not exists desconto_lancado_por uuid references public.usuarios (id);

alter table public.ordens_servico
  add column if not exists desconto_lancado_em timestamptz;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_desconto_valor_check;

alter table public.ordens_servico
  add constraint ordens_servico_desconto_valor_check
  check (desconto_valor is null or desconto_valor >= 0);
