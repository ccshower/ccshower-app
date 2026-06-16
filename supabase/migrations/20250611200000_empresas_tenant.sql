-- Tenant: tabela empresas + FK em ordens_servico (produção já pode ter a FK)

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
    select 1 from pg_constraint where conname = 'ordens_servico_empresa_id_fkey'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_empresa_id_fkey
      foreign key (empresa_id) references public.empresas (id);
  end if;
end $$;

create index if not exists idx_empresas_ativo on public.empresas (ativo);

insert into public.empresas (nome, ativo)
select 'CC Shower Door', true
where not exists (select 1 from public.empresas where ativo = true);
