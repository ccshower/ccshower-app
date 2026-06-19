-- Catch-up: status de instalação por ambiente (fotos e bloqueios parciais)

alter table public.os_ambientes
  add column if not exists instalacao_status text not null default 'pending'
    check (instalacao_status in ('pending', 'completed', 'blocked'));

alter table public.os_ambientes
  add column if not exists instalacao_bloqueio_categoria text;

alter table public.os_ambientes
  add column if not exists instalacao_bloqueio_motivo text;

alter table public.os_ambientes
  add column if not exists instalacao_bloqueio_observacao text;

alter table public.os_ambientes
  add column if not exists instalacao_concluida_em timestamptz;

create index if not exists idx_os_ambientes_instalacao_status
  on public.os_ambientes (ordem_servico_id, instalacao_status)
  where ativo = true;
