-- Telefone do cliente é obrigatório só para residential e commercial.
-- Architect, partner, contractor e other podem ficar com telefone nulo.
-- Contractor exige contractor_id. O telefone de public.contractors não é copiado.
-- Não aplicar automaticamente. Falha se já existir residential ou commercial
-- com telefone nulo ou em branco, ou contractor sem contractor_id.

alter table public.clientes
  alter column telefone drop not null;

alter table public.clientes
  drop constraint if exists clientes_telefone_por_tipo_check;

alter table public.clientes
  add constraint clientes_telefone_por_tipo_check
  check (
    (
      tipo_cliente in ('residential', 'commercial')
      and telefone is not null
      and btrim(telefone) <> ''
    )
    or
    (
      tipo_cliente = 'contractor'
      and contractor_id is not null
    )
    or
    (
      tipo_cliente in ('architect', 'partner', 'other')
    )
  );

comment on constraint clientes_telefone_por_tipo_check on public.clientes is
  'Telefone não vazio é obrigatório só para residential e commercial. Contractor exige contractor_id e pode ficar sem telefone do cliente.';
