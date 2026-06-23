-- Remove tipo construction_company (Builder/Construtora) — usar apenas contractor.

update public.clientes
set tipo_cliente = 'contractor'
where tipo_cliente in ('construction_company', 'CONSTRUTORA');

alter table public.clientes drop constraint if exists clientes_tipo_cliente_check;
alter table public.clientes
  add constraint clientes_tipo_cliente_check
  check (
    tipo_cliente in (
      'contractor',
      'residential',
      'architect',
      'partner',
      'commercial',
      'other'
    )
  );
