-- CCSHOWER fase 1: equipes, usuarios, RLS, realtime
-- Timezone operacional: America/New_York (Florida)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- equipes
-- ---------------------------------------------------------------------------
create table public.equipes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor_primaria text not null default '#7189a8',
  cor_secundaria text not null default '#e8f0f7',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_equipes_ativo on public.equipes (ativo);
create index idx_equipes_nome on public.equipes (nome);

-- ---------------------------------------------------------------------------
-- usuarios (1:1 com auth.users)
-- ---------------------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  telefone text,
  email text not null,
  equipe_id uuid references public.equipes (id),
  tipo_usuario text not null default 'comum'
    check (tipo_usuario in ('comum', 'admin')),
  pode_editar_agenda boolean not null default false,
  pode_ver_todas_equipes boolean not null default false,
  pode_gerenciar_estoque boolean not null default false,
  pode_resolver_crash boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index idx_usuarios_equipe_id on public.usuarios (equipe_id);
create index idx_usuarios_email on public.usuarios (email);
create index idx_usuarios_ativo on public.usuarios (ativo);
create index idx_usuarios_tipo on public.usuarios (tipo_usuario);

-- ---------------------------------------------------------------------------
-- triggers atualizado_em
-- ---------------------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_equipes_atualizado_em
before update on public.equipes
for each row execute function public.set_atualizado_em();

create trigger trg_usuarios_atualizado_em
before update on public.usuarios
for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- funções auxiliares RLS (security definer)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.equipes enable row level security;
alter table public.usuarios enable row level security;

-- equipes: admin CRUD; demais usuários ativos leem apenas a própria equipe
create policy equipes_select_scope
on public.equipes
for select
to authenticated
using (
  public.can_view_all_equipes()
  or id = public.current_equipe_id()
);

create policy equipes_insert_admin
on public.equipes
for insert
to authenticated
with check (public.can_manage_sistema());

create policy equipes_update_admin
on public.equipes
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

-- usuarios: cada um lê o próprio perfil; admin lê todos
create policy usuarios_select_scope
on public.usuarios
for select
to authenticated
using (
  id = auth.uid()
  or public.can_manage_sistema()
);

-- usuarios: apenas admin altera cadastro (fase admin)
create policy usuarios_update_admin
on public.usuarios
for update
to authenticated
using (public.can_manage_sistema())
with check (public.can_manage_sistema());

create policy usuarios_insert_admin
on public.usuarios
for insert
to authenticated
with check (public.can_manage_sistema());

-- ---------------------------------------------------------------------------
-- sincroniza email vindo do auth (opcional, mantém consistência)
-- ---------------------------------------------------------------------------
create or replace function public.sync_usuario_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.usuarios
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

create trigger trg_auth_user_email_sync
after update of email on auth.users
for each row
execute function public.sync_usuario_email_from_auth();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.equipes;
alter publication supabase_realtime add table public.usuarios;

-- Bootstrap do primeiro admin (manual no Supabase):
-- 1) Authentication → Add user (e-mail + senha).
-- 2) SQL: insert into public.usuarios (id, nome, email, tipo_usuario, ativo)
--    values ('<uuid do auth.users>', 'Nome', 'email@...', 'admin', true);
