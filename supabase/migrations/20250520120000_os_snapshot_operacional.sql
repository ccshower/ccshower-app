-- Snapshot operacional da OS (fila visual: equipe + etapa + status)

alter table public.ordens_servico
  add column if not exists equipe_atual_id uuid references public.equipes (id),
  add column if not exists etapa_atual text not null default 'comercial'
    check (etapa_atual in ('comercial', 'projeto', 'financeiro', 'instalacao')),
  add column if not exists status_atual text not null default 'visita_agendada';

create index if not exists idx_ordens_servico_equipe_atual
  on public.ordens_servico (equipe_atual_id);

create index if not exists idx_ordens_servico_etapa_atual
  on public.ordens_servico (etapa_atual);

create index if not exists idx_ordens_servico_status_atual
  on public.ordens_servico (status_atual);

-- Backfill a partir dos dados existentes
update public.ordens_servico
set
  equipe_atual_id = coalesce(equipe_atual_id, equipe_id),
  etapa_atual = coalesce(nullif(etapa_atual, ''), 'comercial'),
  status_atual = case
    when status = 'concluida' then 'concluida'
    when status = 'cancelada' then 'cancelada'
    when status = 'agendada' then 'visita_agendada'
    when status = 'em_andamento' then 'visita_em_andamento'
    when status = 'aberta' then 'comercial_pendente'
    else coalesce(nullif(status_atual, ''), 'comercial_pendente')
  end
where equipe_atual_id is null or status_atual = 'visita_agendada';
