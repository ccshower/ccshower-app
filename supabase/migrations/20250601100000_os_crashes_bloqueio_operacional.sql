-- Bloqueio Operacional (os_crashes) — ruptura no fluxo da OS

create table if not exists public.os_crashes (
  id uuid primary key default gen_random_uuid(),
  ordem_servico_id uuid not null
    references public.ordens_servico (id) on delete cascade,
  empresa_id uuid,
  etapa text not null,
  categoria text not null,
  motivo text not null,
  observacao text,
  status text not null default 'ativo'
    check (status in ('ativo', 'resolvido')),
  criado_por uuid references public.usuarios (id),
  resolvido_por uuid references public.usuarios (id),
  resolvido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_os_crashes_os on public.os_crashes (ordem_servico_id);
create index if not exists idx_os_crashes_status on public.os_crashes (status);
create index if not exists idx_os_crashes_os_ativo
  on public.os_crashes (ordem_servico_id)
  where status = 'ativo';

create unique index if not exists uq_os_crashes_um_ativo_por_os
  on public.os_crashes (ordem_servico_id)
  where status = 'ativo';

drop trigger if exists trg_os_crashes_atualizado_em on public.os_crashes;
create trigger trg_os_crashes_atualizado_em
before update on public.os_crashes
for each row execute function public.set_atualizado_em();

alter table public.os_crashes enable row level security;

drop policy if exists os_crashes_select on public.os_crashes;
create policy os_crashes_select
on public.os_crashes
for select
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
    )
  )
);

drop policy if exists os_crashes_insert on public.os_crashes;
create policy os_crashes_insert
on public.os_crashes
for insert
to authenticated
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_view_all_equipes()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
    )
  )
);

drop policy if exists os_crashes_update on public.os_crashes;
create policy os_crashes_update
on public.os_crashes
for update
to authenticated
using (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
    )
  )
)
with check (
  exists (
    select 1 from public.ordens_servico os
    where os.id = ordem_servico_id
    and (
      public.can_manage_sistema()
      or os.responsavel_id = auth.uid()
      or os.criado_por = auth.uid()
      or os.equipe_id = public.current_equipe_id()
      or os.equipe_atual_id = public.current_equipe_id()
    )
  )
);
