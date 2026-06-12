-- =============================================================================
-- CCSHOWER — Reset do banco para entrega ao cliente
-- =============================================================================
-- Onde rodar: Supabase Dashboard → SQL Editor → New query → colar → Run
--
-- ⚠️  IRREVERSÍVEL. Faça backup/export antes se precisar recuperar algo.
--
-- O que APAGA:
--   • Clientes, OS, agenda, bloqueios, lista de separação, anexos (metadados)
--   • Arquivos no bucket storage "os-anexos" (fotos, PDFs, comprovantes)
--   • Catálogo de itens e fornecedores
--
-- O que MANTÉM (estrutura + cadastro base):
--   • Schema, migrations, RLS, triggers
--   • Unidades (Jacksonville / Orlando)
--   • Equipes
--   • Usuários (Auth + public.usuarios) — veja seção opcional abaixo
--
-- Depois do reset: crie usuários reais no Admin ou via scripts/seed-test-admin.mjs
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Storage — arquivos físicos dos anexos
-- ---------------------------------------------------------------------------
delete from storage.objects
where bucket_id = 'os-anexos';

-- ---------------------------------------------------------------------------
-- 2) Dados operacionais (transacional)
-- ---------------------------------------------------------------------------
truncate table
  public.os_crashes,
  public.os_separation_list_items,
  public.os_anexos,
  public.agenda_eventos,
  public.ordens_servico,
  public.clientes
restart identity cascade;

-- ---------------------------------------------------------------------------
-- 3) Cadastros auxiliares de teste
-- ---------------------------------------------------------------------------
truncate table
  public.fornecedores,
  public.catalogo_itens
restart identity cascade;

commit;

-- =============================================================================
-- OPCIONAL A — Apagar só usuários de teste (mantém outros logins, se houver)
-- =============================================================================
-- Descomente e ajuste os e-mails antes de rodar (query separada ou no mesmo run):

-- delete from auth.users
-- where lower(email) in (
--   'admin@teste.com.br',
--   'iago@teste.com',
--   'paloma@teste.com'
-- );
-- (public.usuarios some em cascade via FK auth.users)

-- =============================================================================
-- OPCIONAL B — Apagar TODOS os logins (banco 100% zerado de usuários)
-- =============================================================================
-- delete from auth.users;
-- Depois recrie o admin: node scripts/seed-test-admin.mjs (local + service role)

-- =============================================================================
-- OPCIONAL C — Recriar catálogo padrão vazio → com itens seed do sistema
-- =============================================================================
-- insert into public.catalogo_itens (nome, categoria, unidade)
-- values
--   ('Puxador Inox', 'Puxador', 'un'),
--   ('Puxador Preto', 'Puxador', 'un'),
--   ('Perfil Alumínio', 'Perfil', 'm'),
--   ('Perfil Preto', 'Perfil', 'm'),
--   ('Roldana', 'Hardware', 'un'),
--   ('Kit Fixação', 'Fixação', 'kit'),
--   ('Silicone Transparente', 'Silicone', 'un'),
--   ('Silicone Preto', 'Silicone', 'un'),
--   ('Vidro 8mm Transparente', 'Vidro', 'un'),
--   ('Vidro 10mm Transparente', 'Vidro', 'un'),
--   ('Bucha', 'Fixação', 'un'),
--   ('Parafuso', 'Fixação', 'un'),
--   ('Acabamento Inox', 'Acabamento', 'un'),
--   ('Acabamento Preto', 'Acabamento', 'un')
-- on conflict (nome) do nothing;

-- =============================================================================
-- Verificação rápida (rode depois do reset)
-- =============================================================================
-- select 'clientes' as t, count(*) from public.clientes
-- union all select 'ordens_servico', count(*) from public.ordens_servico
-- union all select 'agenda_eventos', count(*) from public.agenda_eventos
-- union all select 'os_anexos', count(*) from public.os_anexos
-- union all select 'catalogo_itens', count(*) from public.catalogo_itens
-- union all select 'fornecedores', count(*) from public.fornecedores
-- union all select 'usuarios', count(*) from public.usuarios
-- union all select 'equipes', count(*) from public.equipes
-- union all select 'unidades', count(*) from public.unidades;
