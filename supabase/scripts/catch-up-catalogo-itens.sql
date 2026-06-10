-- Catch-up: catálogo de itens + item_id na lista de separação

create table if not exists public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  categoria text not null,
  unidade text not null default 'un',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.catalogo_itens (nome, categoria, unidade)
values
  ('Puxador Inox', 'Puxador', 'un'),
  ('Puxador Preto', 'Puxador', 'un'),
  ('Perfil Alumínio', 'Perfil', 'm'),
  ('Perfil Preto', 'Perfil', 'm'),
  ('Roldana', 'Hardware', 'un'),
  ('Kit Fixação', 'Fixação', 'kit'),
  ('Silicone Transparente', 'Silicone', 'un'),
  ('Silicone Preto', 'Silicone', 'un'),
  ('Vidro 8mm Transparente', 'Vidro', 'un'),
  ('Vidro 10mm Transparente', 'Vidro', 'un'),
  ('Bucha', 'Fixação', 'un'),
  ('Parafuso', 'Fixação', 'un'),
  ('Acabamento Inox', 'Acabamento', 'un'),
  ('Acabamento Preto', 'Acabamento', 'un')
on conflict (nome) do nothing;

delete from public.os_separation_list_items;

alter table public.os_separation_list_items
  drop column if exists item_description;

alter table public.os_separation_list_items
  add column if not exists item_id uuid references public.catalogo_itens (id);

-- Só aplique NOT NULL se a tabela estiver vazia ou todos os rows tiverem item_id
alter table public.os_separation_list_items
  alter column item_id set not null;
