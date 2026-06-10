-- Catálogo padronizado de itens + referência na lista de separação

-- ---------------------------------------------------------------------------
-- catalogo_itens
-- ---------------------------------------------------------------------------
create table if not exists public.catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  unidade text not null default 'un',
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create unique index if not exists idx_catalogo_itens_nome_unique
  on public.catalogo_itens (nome);

create index if not exists idx_catalogo_itens_categoria
  on public.catalogo_itens (categoria)
  where ativo = true;

create index if not exists idx_catalogo_itens_ativo
  on public.catalogo_itens (ativo);

alter table public.catalogo_itens enable row level security;

drop policy if exists catalogo_itens_select on public.catalogo_itens;
create policy catalogo_itens_select
on public.catalogo_itens
for select
to authenticated
using (ativo = true or public.can_manage_sistema());

-- Mock inicial para validação do fluxo Projeto → Lista de Separação
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

-- ---------------------------------------------------------------------------
-- os_separation_list_items — referência ao catálogo (item_id)
-- ---------------------------------------------------------------------------
delete from public.os_separation_list_items;

alter table public.os_separation_list_items
  drop column if exists item_description;

alter table public.os_separation_list_items
  add column if not exists item_id uuid references public.catalogo_itens (id);

alter table public.os_separation_list_items
  alter column item_id set not null;

create index if not exists idx_os_separation_list_item_id
  on public.os_separation_list_items (item_id);
