-- Contractors (empreiteiros/parceiros B2B) + vínculo em clientes.

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create unique index if not exists idx_contractors_nome_unique
  on public.contractors (lower(nome));

create index if not exists idx_contractors_ativo
  on public.contractors (ativo);

drop trigger if exists trg_contractors_atualizado_em on public.contractors;
create trigger trg_contractors_atualizado_em
before update on public.contractors
for each row execute function public.set_atualizado_em();

alter table public.contractors enable row level security;

drop policy if exists contractors_select on public.contractors;
create policy contractors_select
on public.contractors
for select
to authenticated
using (ativo = true or public.can_manage_sistema());

drop policy if exists contractors_insert on public.contractors;
create policy contractors_insert
on public.contractors
for insert
to authenticated
with check (public.can_manage_sistema());

drop policy if exists contractors_update on public.contractors;
create policy contractors_update
on public.contractors
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

grant select on public.contractors to authenticated;

-- ---------------------------------------------------------------------------
-- clientes: tipo contractor + FK
-- ---------------------------------------------------------------------------
alter table public.clientes
  add column if not exists contractor_id uuid references public.contractors (id);

create index if not exists idx_clientes_contractor_id
  on public.clientes (contractor_id)
  where contractor_id is not null;

alter table public.clientes drop constraint if exists clientes_tipo_cliente_check;
alter table public.clientes
  add constraint clientes_tipo_cliente_check
  check (
    tipo_cliente in (
      'contractor',
      'residential',
      'architect',
      'partner',
      'commercial',
      'other'
    )
  );

comment on column public.clientes.contractor_id is
  'Contractor vinculado quando tipo_cliente = contractor';
