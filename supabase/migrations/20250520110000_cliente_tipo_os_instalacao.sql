-- tipo_cliente no cadastro + flag operacional possui_instalacao na OS

alter table public.clientes
  add column if not exists tipo_cliente text not null default 'RESIDENCIAL'
    check (
      tipo_cliente in (
        'RESIDENCIAL',
        'CONSTRUTORA',
        'ARQUITETO',
        'PARCEIRO',
        'COMERCIAL',
        'OUTRO'
      )
    );

create index if not exists idx_clientes_tipo_cliente on public.clientes (tipo_cliente);

alter table public.ordens_servico
  add column if not exists possui_instalacao boolean not null default true;

create index if not exists idx_ordens_servico_possui_instalacao
  on public.ordens_servico (possui_instalacao);
