-- Empresa padrão + backfill empresa_id (FK ordens_servico → empresas)
-- Rode no Supabase → SQL Editor (bloco inteiro)

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.clientes
  add column if not exists empresa_id uuid references public.empresas (id);

alter table public.usuarios
  add column if not exists empresa_id uuid references public.empresas (id);

alter table public.ordens_servico
  add column if not exists empresa_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordens_servico_empresa_id_fkey'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_empresa_id_fkey
      foreign key (empresa_id) references public.empresas (id);
  end if;
end $$;

-- Empresa padrão (ajuste o nome se já existir outra)
insert into public.empresas (nome, ativo)
select 'CC Shower Door', true
where not exists (
  select 1 from public.empresas where ativo = true
);

-- Corrige registros que receberam unidade_id por engano em empresa_id
update public.clientes c
set empresa_id = null
where c.empresa_id is not null
  and not exists (select 1 from public.empresas e where e.id = c.empresa_id);

update public.usuarios u
set empresa_id = null
where u.empresa_id is not null
  and not exists (select 1 from public.empresas e where e.id = u.empresa_id);

update public.ordens_servico os
set empresa_id = null
where os.empresa_id is not null
  and not exists (select 1 from public.empresas e where e.id = os.empresa_id);

-- Backfill a partir da primeira empresa ativa
with default_empresa as (
  select id
  from public.empresas
  where ativo = true
  order by criado_em
  limit 1
)
update public.usuarios u
set empresa_id = d.id
from default_empresa d
where u.empresa_id is null;

with default_empresa as (
  select id
  from public.empresas
  where ativo = true
  order by criado_em
  limit 1
)
update public.clientes c
set empresa_id = d.id
from default_empresa d
where c.empresa_id is null;

-- Conferir
select id, nome, ativo from public.empresas order by nome;
select count(*) filter (where empresa_id is null) as usuarios_sem_empresa from public.usuarios;
select count(*) filter (where empresa_id is null) as clientes_sem_empresa from public.clientes;
