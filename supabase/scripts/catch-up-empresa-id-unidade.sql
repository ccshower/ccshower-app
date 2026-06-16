-- Backfill empresa_id a partir de unidade_id (tenant operacional)
-- Rode no Supabase → SQL Editor se OS antigas ficaram sem empresa_id

alter table public.clientes
  add column if not exists empresa_id uuid;

alter table public.usuarios
  add column if not exists empresa_id uuid;

alter table public.ordens_servico
  add column if not exists empresa_id uuid;

update public.clientes
set empresa_id = unidade_id
where empresa_id is null
  and unidade_id is not null;

update public.usuarios
set empresa_id = unidade_id
where empresa_id is null
  and unidade_id is not null;

update public.ordens_servico os
set empresa_id = c.empresa_id
from public.clientes c
where os.cliente_id = c.id
  and os.empresa_id is null
  and c.empresa_id is not null;

update public.ordens_servico os
set empresa_id = c.unidade_id
from public.clientes c
where os.cliente_id = c.id
  and os.empresa_id is null
  and c.unidade_id is not null;

-- Conferir clientes órfãos (sem OS)
select c.id, c.nome, c.empresa_id, c.unidade_id
from public.clientes c
left join public.ordens_servico os on os.cliente_id = c.id
where os.id is null
order by c.criado_em desc
limit 20;
