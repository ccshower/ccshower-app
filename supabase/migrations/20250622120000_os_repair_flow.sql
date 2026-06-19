-- Fluxo REPAIR: reabrir OS concluída direto na Instalação (mesma equipe Install, badge REPAIR).

alter table public.ordens_servico
  add column if not exists repair_ativo boolean not null default false;

alter table public.ordens_servico
  add column if not exists repair_episode_id uuid;

alter table public.agenda_eventos
  add column if not exists is_repair boolean not null default false;

create table if not exists public.os_repair_episodes (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  os_ambiente_id uuid references public.os_ambientes (id) on delete set null,
  empresa_id uuid references public.empresas (id),
  valor_sugerido numeric(12, 2),
  valor_final numeric(12, 2),
  valor_alteracao_observacao text,
  aberto_por uuid references public.usuarios (id),
  aberto_em timestamptz not null default now(),
  concluido_em timestamptz,
  agenda_evento_id uuid references public.agenda_eventos (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled'))
);

create index if not exists idx_os_repair_episodes_os
  on public.os_repair_episodes (ordem_servico_id, status);

create index if not exists idx_ordens_servico_repair_ativo
  on public.ordens_servico (repair_ativo)
  where repair_ativo = true;

alter table public.ordens_servico
  drop constraint if exists ordens_servico_repair_episode_id_fkey;

alter table public.ordens_servico
  add constraint ordens_servico_repair_episode_id_fkey
  foreign key (repair_episode_id) references public.os_repair_episodes (id)
  on delete set null;

alter table public.agenda_eventos
  drop constraint if exists agenda_eventos_tipo_evento_check;

alter table public.agenda_eventos
  add constraint agenda_eventos_tipo_evento_check
  check (
    tipo_evento in (
      'technical_visit',
      'measurement',
      'installation',
      'installation_completed',
      'stage_changed',
      'status_changed',
      'os_created',
      'financial_approved',
      'financial_rejected',
      'project_completed',
      'repair_opened',
      'repair_completed',
      'other'
    )
  );

alter table public.os_repair_episodes enable row level security;

drop policy if exists os_repair_episodes_select on public.os_repair_episodes;
create policy os_repair_episodes_select
on public.os_repair_episodes
for select
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = os_repair_episodes.ordem_servico_id
  )
);

drop policy if exists os_repair_episodes_insert on public.os_repair_episodes;
create policy os_repair_episodes_insert
on public.os_repair_episodes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = os_repair_episodes.ordem_servico_id
  )
);

drop policy if exists os_repair_episodes_update on public.os_repair_episodes;
create policy os_repair_episodes_update
on public.os_repair_episodes
for update
to authenticated
using (
  exists (
    select 1
    from public.ordens_servico os
    where os.id = os_repair_episodes.ordem_servico_id
  )
);
