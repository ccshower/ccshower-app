-- OS environments (commercial visit — multiple bathrooms per work order)

create table if not exists public.os_ambientes (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null
    references public.ordens_servico (id) on delete cascade,
  empresa_id uuid,
  nome text not null,
  especificacoes text,
  valor_comercial numeric(12, 2),
  sort_order integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_os_ambientes_os
  on public.os_ambientes (ordem_servico_id);

create index if not exists idx_os_ambientes_os_ativo
  on public.os_ambientes (ordem_servico_id, ativo)
  where ativo = true;

create or replace function public.set_os_ambientes_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_os_ambientes_atualizado_em on public.os_ambientes;

create trigger trg_os_ambientes_atualizado_em
before update on public.os_ambientes
for each row
execute function public.set_os_ambientes_atualizado_em();

alter table public.os_anexos
  add column if not exists os_ambiente_id uuid
    references public.os_ambientes (id) on delete set null;

create index if not exists idx_os_anexos_ambiente
  on public.os_anexos (os_ambiente_id)
  where os_ambiente_id is not null;

alter table public.os_ambientes enable row level security;

drop policy if exists os_ambientes_select on public.os_ambientes;
create policy os_ambientes_select
on public.os_ambientes
for select
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_view_all_equipes()
      or public.user_equipe_is_financial_review()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or (
        public.user_equipe_is_commercial_stage()
        and os.etapa_atual = 'commercial'
      )
    )
  )
);

drop policy if exists os_ambientes_insert on public.os_ambientes;
create policy os_ambientes_insert
on public.os_ambientes
for insert
to authenticated
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);

drop policy if exists os_ambientes_update on public.os_ambientes;
create policy os_ambientes_update
on public.os_ambientes
for update
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
)
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);

drop policy if exists os_ambientes_delete on public.os_ambientes;
create policy os_ambientes_delete
on public.os_ambientes
for delete
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
    )
  )
);
