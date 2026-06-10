-- Multiunidade FASE 1: tabela unidades + unidade_id (nullable) nas tabelas raiz
-- Sem regras de negócio, sem filtros, sem backfill obrigatório.

-- ---------------------------------------------------------------------------
-- unidades
-- ---------------------------------------------------------------------------
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  timezone text not null default 'America/New_York',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index if not exists idx_unidades_nome_unique
  on public.unidades (nome);

create index if not exists idx_unidades_ativo
  on public.unidades (ativo);

alter table public.unidades enable row level security;

drop policy if exists unidades_select on public.unidades;
create policy unidades_select
on public.unidades
for select
to authenticated
using (true);

grant select on public.unidades to authenticated;

-- ---------------------------------------------------------------------------
-- unidade_id (nullable nesta fase) + FK + índice
-- ---------------------------------------------------------------------------
alter table public.clientes
  add column if not exists unidade_id uuid references public.unidades (id);

alter table public.usuarios
  add column if not exists unidade_id uuid references public.unidades (id);

alter table public.equipes
  add column if not exists unidade_id uuid references public.unidades (id);

alter table public.ordens_servico
  add column if not exists unidade_id uuid references public.unidades (id);

alter table public.agenda_eventos
  add column if not exists unidade_id uuid references public.unidades (id);

create index if not exists idx_clientes_unidade on public.clientes (unidade_id);
create index if not exists idx_usuarios_unidade on public.usuarios (unidade_id);
create index if not exists idx_equipes_unidade on public.equipes (unidade_id);
create index if not exists idx_ordens_servico_unidade on public.ordens_servico (unidade_id);
create index if not exists idx_agenda_eventos_unidade on public.agenda_eventos (unidade_id);

-- ---------------------------------------------------------------------------
-- seed: unidades iniciais
-- ---------------------------------------------------------------------------
insert into public.unidades (nome, timezone)
values
  ('Jacksonville', 'America/New_York'),
  ('Orlando', 'America/New_York')
on conflict (nome) do nothing;
