-- Multi-tenant: empresa_id em OS e anexos (alinhamento producao)

alter table public.ordens_servico
  add column if not exists empresa_id uuid;

alter table public.os_anexos
  add column if not exists empresa_id uuid;

-- Preenche OS a partir do cliente (quando aplicavel)
update public.ordens_servico os
set empresa_id = c.empresa_id
from public.clientes c
where os.cliente_id = c.id
  and os.empresa_id is null
  and c.empresa_id is not null;

-- Preenche anexos existentes a partir da OS
update public.os_anexos a
set empresa_id = os.empresa_id
from public.ordens_servico os
where a.ordem_servico_id = os.id
  and a.empresa_id is null
  and os.empresa_id is not null;

create index if not exists idx_os_anexos_empresa on public.os_anexos (empresa_id);
