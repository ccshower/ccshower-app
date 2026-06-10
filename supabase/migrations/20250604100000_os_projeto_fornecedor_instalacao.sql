-- Etapa Projeto: fornecedor, previsão de material e agendamento de instalação

-- ---------------------------------------------------------------------------
-- fornecedores
-- ---------------------------------------------------------------------------
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index if not exists idx_fornecedores_nome_unique
  on public.fornecedores (nome);

create index if not exists idx_fornecedores_ativo
  on public.fornecedores (ativo);

alter table public.fornecedores enable row level security;

drop policy if exists fornecedores_select on public.fornecedores;
create policy fornecedores_select
on public.fornecedores
for select
to authenticated
using (ativo = true or public.can_manage_sistema());

grant select on public.fornecedores to authenticated;
grant select on public.fornecedores to anon;

insert into public.fornecedores (nome)
values
  ('CRYSTAL TEMPERING'),
  ('SHAPE GLASS'),
  ('M&F HOME SOLUTIONS')
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------------
-- ordens_servico — dados de projeto / material
-- ---------------------------------------------------------------------------
alter table public.ordens_servico
  add column if not exists fornecedor_id uuid references public.fornecedores (id),
  add column if not exists data_prevista_material date;

create index if not exists idx_ordens_servico_fornecedor_id
  on public.ordens_servico (fornecedor_id)
  where fornecedor_id is not null;
