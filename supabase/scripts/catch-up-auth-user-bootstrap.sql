-- Fix: "Database error creating new user" ao criar usuário no Admin
-- Rode no Supabase → SQL Editor (bloco inteiro, de uma vez)

-- ---------------------------------------------------------------------------
-- 1) Tipos permitidos em usuarios
-- ---------------------------------------------------------------------------
alter table public.usuarios drop constraint if exists usuarios_tipo_usuario_check;

alter table public.usuarios
  add constraint usuarios_tipo_usuario_check
  check (tipo_usuario in ('comum', 'manager', 'admin'));

-- ---------------------------------------------------------------------------
-- 2) Pré-requisitos multiunidade (caso migrations 20250606/07 não tenham rodado)
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

alter table public.unidades
  add column if not exists matriz boolean not null default false;

alter table public.usuarios
  add column if not exists unidade_id uuid references public.unidades (id);

insert into public.unidades (nome, timezone, matriz)
values ('Jacksonville', 'America/New_York', true)
on conflict (nome) do update set matriz = true;

create or replace function public.unidade_matriz_id()
returns uuid
language sql
stable
as $$
  select id from public.unidades where matriz = true limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 3) Remove TODOS os triggers customizados em auth.users
--    (profiles, handle_auth_user, versões antigas quebradas, etc.)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tgname
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on auth.users', r.tgname);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Trigger seguro: não bloqueia criação no Auth se o INSERT em usuarios falhar
--    (o app faz upsert com service role logo depois do createUser)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_tipo text;
  v_unidade uuid;
begin
  v_nome := nullif(trim(coalesce(new.raw_user_meta_data->>'nome', '')), '');
  if v_nome is null then
    v_nome := initcap(split_part(coalesce(new.email, 'usuario'), '@', 1));
  end if;

  v_tipo := coalesce(nullif(trim(new.raw_user_meta_data->>'tipo_usuario'), ''), 'comum');
  if v_tipo not in ('comum', 'manager', 'admin') then
    v_tipo := 'comum';
  end if;

  v_unidade := public.unidade_matriz_id();

  insert into public.usuarios (id, nome, email, tipo_usuario, ativo, unidade_id)
  values (
    new.id,
    v_nome,
    coalesce(new.email, ''),
    v_tipo,
    true,
    v_unidade
  )
  on conflict (id) do update
  set
    email = excluded.email,
    nome = coalesce(nullif(trim(public.usuarios.nome), ''), excluded.nome);

  return new;
exception
  when others then
    raise warning 'handle_new_user skipped for %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5) Conferência
-- ---------------------------------------------------------------------------
select tgname as auth_triggers
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and not tgisinternal;

select id, nome, matriz from public.unidades order by nome;

select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.usuarios'::regclass
  and conname = 'usuarios_tipo_usuario_check';
