-- CCSHOWER: ordens de servico + agenda_eventos (nucleo operacional)

create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  titulo text not null,
  descricao text,
  status text not null default 'aberta'
    check (status in ('aberta', 'agendada', 'em_andamento', 'concluida', 'cancelada')),
  equipe_id uuid references public.equipes (id),
  responsavel_id uuid references public.usuarios (id),
  valor_previsto numeric(12, 2),
  criado_por uuid references public.usuarios (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_ordens_servico_cliente on public.ordens_servico (cliente_id);
create index if not exists idx_ordens_servico_equipe on public.ordens_servico (equipe_id);
create index if not exists idx_ordens_servico_responsavel on public.ordens_servico (responsavel_id);
create index if not exists idx_ordens_servico_status on public.ordens_servico (status);
create index if not exists idx_ordens_servico_criado_em on public.ordens_servico (criado_em);
create index if not exists idx_ordens_servico_ativo on public.ordens_servico (ativo);

drop trigger if exists trg_ordens_servico_atualizado_em on public.ordens_servico;
create trigger trg_ordens_servico_atualizado_em
before update on public.ordens_servico
for each row execute function public.set_atualizado_em();

-- ---------------------------------------------------------------------------
-- agenda_eventos
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id),
  equipe_id uuid references public.equipes (id),
  responsavel_id uuid references public.usuarios (id),
  tipo_evento text not null default 'visita_tecnica'
    check (tipo_evento in ('visita_tecnica', 'medicao', 'instalacao', 'outro')),
  etapa text not null default 'comercial'
    check (etapa in ('comercial', 'projeto', 'financeiro', 'instalacao')),
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'em_campo', 'concluido', 'cancelado')),
  titulo text not null,
  descricao text,
  data_evento timestamptz not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_agenda_eventos_os on public.agenda_eventos (ordem_servico_id);
create index if not exists idx_agenda_eventos_cliente on public.agenda_eventos (cliente_id);
create index if not exists idx_agenda_eventos_equipe on public.agenda_eventos (equipe_id);
create index if not exists idx_agenda_eventos_data on public.agenda_eventos (data_evento);
create index if not exists idx_agenda_eventos_status on public.agenda_eventos (status);
create index if not exists idx_agenda_eventos_tipo on public.agenda_eventos (tipo_evento);

drop trigger if exists trg_agenda_eventos_atualizado_em on public.agenda_eventos;
create trigger trg_agenda_eventos_atualizado_em
before update on public.agenda_eventos
for each row execute function public.set_atualizado_em();

-- Primeiro evento automatico ao criar OS
create or replace function public.criar_evento_inicial_ordem_servico()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cli record;
  data_visita timestamptz;
begin
  select c.equipe_id into cli
  from public.clientes c
  where c.id = new.cliente_id;

  data_visita :=
    ((date_trunc('day', now() at time zone 'America/New_York') + interval '1 day')
      + time '09:00') at time zone 'America/New_York';

  insert into public.agenda_eventos (
    ordem_servico_id,
    cliente_id,
    equipe_id,
    responsavel_id,
    tipo_evento,
    etapa,
    status,
    titulo,
    descricao,
    data_evento
  )
  values (
    new.id,
    new.cliente_id,
    coalesce(new.equipe_id, cli.equipe_id),
    new.responsavel_id,
    'visita_tecnica',
    'comercial',
    'agendado',
    new.titulo,
    new.descricao,
    data_visita
  );

  return new;
end;
$$;

drop trigger if exists trg_ordem_servico_evento_inicial on public.ordens_servico;
create trigger trg_ordem_servico_evento_inicial
after insert on public.ordens_servico
for each row execute function public.criar_evento_inicial_ordem_servico();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ordens_servico enable row level security;
alter table public.agenda_eventos enable row level security;

drop policy if exists ordens_servico_select on public.ordens_servico;
create policy ordens_servico_select
on public.ordens_servico
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
);

drop policy if exists ordens_servico_insert on public.ordens_servico;
create policy ordens_servico_insert
on public.ordens_servico
for insert
to authenticated
with check (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
);

drop policy if exists ordens_servico_update on public.ordens_servico;
create policy ordens_servico_update
on public.ordens_servico
for update
to authenticated
using (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
  or equipe_id = public.current_equipe_id()
)
with check (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
  or equipe_id = public.current_equipe_id()
);

drop policy if exists agenda_eventos_select on public.agenda_eventos;
create policy agenda_eventos_select
on public.agenda_eventos
for select
to authenticated
using (
  public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
  or responsavel_id = auth.uid()
);

drop policy if exists agenda_eventos_insert on public.agenda_eventos;
create policy agenda_eventos_insert
on public.agenda_eventos
for insert
to authenticated
with check (
  public.can_manage_sistema()
  or public.can_view_all_equipes()
  or equipe_id = public.current_equipe_id()
);

drop policy if exists agenda_eventos_update on public.agenda_eventos;
create policy agenda_eventos_update
on public.agenda_eventos
for update
to authenticated
using (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
)
with check (
  public.can_manage_sistema()
  or responsavel_id = auth.uid()
  or equipe_id = public.current_equipe_id()
);

do $$
begin
  alter publication supabase_realtime add table public.ordens_servico;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.agenda_eventos;
exception when duplicate_object then null;
end $$;
