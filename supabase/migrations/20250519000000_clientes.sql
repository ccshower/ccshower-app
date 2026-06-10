-- CCSHOWER fase 2: clientes, endereco Google Places, RLS, realtime
-- Requer tabelas: equipes, usuarios (fase 1). Funções abaixo são recriadas se faltarem.

create extension if not exists "pgcrypto";

-- Pré-requisitos (normalmente criados em 20250511000000 / 20250511200000)
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create or replace function public.can_manage_sistema()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.ativo, true)
      and u.tipo_usuario = 'admin'
  );
$$;

create or replace function public.can_view_all_equipes()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.ativo, true)
      and (
        u.tipo_usuario = 'admin'
        or coalesce(u.pode_ver_todas_equipes, false)
      )
  );
$$;

create or replace function public.current_equipe_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.equipe_id
  from public.usuarios u
  where u.id = auth.uid()
    and coalesce(u.ativo, true)
  limit 1;
$$;

grant execute on function public.can_manage_sistema() to authenticated;
grant execute on function public.can_view_all_equipes() to authenticated;
grant execute on function public.current_equipe_id() to authenticated;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  endereco_formatado text not null,
  endereco_linha1 text,
  cidade text,
  estado text,
  cep text,
  pais text not null default 'US',
  google_place_id text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_maps_url text,
  observacoes text,
  equipe_id uuid references public.equipes (id),
  responsavel_comercial_id uuid references public.usuarios (id),
  criado_por uuid references public.usuarios (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_clientes_nome on public.clientes (nome);
create index if not exists idx_clientes_telefone on public.clientes (telefone);
create index if not exists idx_clientes_equipe_id on public.clientes (equipe_id);
create index if not exists idx_clientes_responsavel on public.clientes (responsavel_comercial_id);
create index if not exists idx_clientes_criado_por on public.clientes (criado_por);
create index if not exists idx_clientes_ativo on public.clientes (ativo);
create index if not exists idx_clientes_google_place_id on public.clientes (google_place_id);
create index if not exists idx_clientes_criado_em on public.clientes (criado_em);

drop trigger if exists trg_clientes_atualizado_em on public.clientes;
create trigger trg_clientes_atualizado_em
before update on public.clientes
for each row execute function public.set_atualizado_em();

alter table public.clientes enable row level security;

drop policy if exists clientes_select_scope on public.clientes;
create policy clientes_select_scope
on public.clientes
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or criado_por = auth.uid()
  or responsavel_comercial_id = auth.uid()
);

drop policy if exists clientes_insert_scope on public.clientes;
create policy clientes_insert_scope
on public.clientes
for insert
to authenticated
with check (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or criado_por = auth.uid()
  or responsavel_comercial_id = auth.uid()
);

drop policy if exists clientes_update_scope on public.clientes;
create policy clientes_update_scope
on public.clientes
for update
to authenticated
using (
  public.can_manage_sistema()
  or criado_por = auth.uid()
  or responsavel_comercial_id = auth.uid()
)
with check (
  public.can_manage_sistema()
  or criado_por = auth.uid()
  or responsavel_comercial_id = auth.uid()
);

do $$
begin
  alter publication supabase_realtime add table public.clientes;
exception
  when duplicate_object then null;
end $$;
