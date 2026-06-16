-- Várias equipes podem servir a mesma etapa (ex.: Commercial + SALES → commercial).
-- O índice único impedia marcar mais de uma equipe com o mesmo codigo_operacional.

drop index if exists public.idx_equipes_codigo_operacional;

create index if not exists idx_equipes_codigo_operacional
  on public.equipes (codigo_operacional)
  where codigo_operacional is not null;
