-- Multiunidade FASE 1b: matriz, backfill Jacksonville e herança automática
-- Novos registros nascem com unidade_id sem alterar formulários/actions.

-- ---------------------------------------------------------------------------
-- Jacksonville é a matriz (única)
-- ---------------------------------------------------------------------------
alter table public.unidades
  add column if not exists matriz boolean not null default false;

update public.unidades set matriz = true where nome = 'Jacksonville';

create unique index if not exists idx_unidades_matriz_unique
  on public.unidades (matriz)
  where matriz = true;

-- Fallback central: unidade matriz
create or replace function public.unidade_matriz_id()
returns uuid
language sql
stable
as $$
  select id from public.unidades where matriz limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Backfill: todo o legado pertence à matriz (Jacksonville)
-- ---------------------------------------------------------------------------
update public.clientes
  set unidade_id = public.unidade_matriz_id()
  where unidade_id is null;

update public.usuarios
  set unidade_id = public.unidade_matriz_id()
  where unidade_id is null;

update public.equipes
  set unidade_id = public.unidade_matriz_id()
  where unidade_id is null;

update public.ordens_servico
  set unidade_id = public.unidade_matriz_id()
  where unidade_id is null;

update public.agenda_eventos
  set unidade_id = public.unidade_matriz_id()
  where unidade_id is null;

-- ---------------------------------------------------------------------------
-- Herança automática no INSERT (sem tocar no código da aplicação)
-- ---------------------------------------------------------------------------

-- clientes: herda do usuário criador; fallback matriz
create or replace function public.set_cliente_unidade_id()
returns trigger
language plpgsql
as $$
begin
  if new.unidade_id is null and new.criado_por is not null then
    select u.unidade_id into new.unidade_id
    from public.usuarios u
    where u.id = new.criado_por;
  end if;
  if new.unidade_id is null then
    new.unidade_id := public.unidade_matriz_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clientes_unidade on public.clientes;
create trigger trg_clientes_unidade
before insert on public.clientes
for each row execute function public.set_cliente_unidade_id();

-- ordens_servico: herda do cliente; fallback matriz
create or replace function public.set_os_unidade_id()
returns trigger
language plpgsql
as $$
begin
  if new.unidade_id is null then
    select c.unidade_id into new.unidade_id
    from public.clientes c
    where c.id = new.cliente_id;
  end if;
  if new.unidade_id is null then
    new.unidade_id := public.unidade_matriz_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ordens_servico_unidade on public.ordens_servico;
create trigger trg_ordens_servico_unidade
before insert on public.ordens_servico
for each row execute function public.set_os_unidade_id();

-- agenda_eventos: herda da OS; fallback cliente; fallback matriz
create or replace function public.set_agenda_evento_unidade_id()
returns trigger
language plpgsql
as $$
begin
  if new.unidade_id is null and new.ordem_servico_id is not null then
    select os.unidade_id into new.unidade_id
    from public.ordens_servico os
    where os.id = new.ordem_servico_id;
  end if;
  if new.unidade_id is null and new.cliente_id is not null then
    select c.unidade_id into new.unidade_id
    from public.clientes c
    where c.id = new.cliente_id;
  end if;
  if new.unidade_id is null then
    new.unidade_id := public.unidade_matriz_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agenda_eventos_unidade on public.agenda_eventos;
create trigger trg_agenda_eventos_unidade
before insert on public.agenda_eventos
for each row execute function public.set_agenda_evento_unidade_id();

-- usuarios e equipes: fallback matriz (até existir UI de unidade no cadastro)
create or replace function public.set_unidade_id_matriz_default()
returns trigger
language plpgsql
as $$
begin
  if new.unidade_id is null then
    new.unidade_id := public.unidade_matriz_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_unidade on public.usuarios;
create trigger trg_usuarios_unidade
before insert on public.usuarios
for each row execute function public.set_unidade_id_matriz_default();

drop trigger if exists trg_equipes_unidade on public.equipes;
create trigger trg_equipes_unidade
before insert on public.equipes
for each row execute function public.set_unidade_id_matriz_default();
