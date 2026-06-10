# CCSHOWER (fase 1)

Next.js (App Router) + TypeScript + Tailwind + Supabase.

## Configuração

1. Copie `.env.example` para `.env.local` e preencha as variáveis.
2. Aplique as migrações em `supabase/migrations/` **na ordem** no SQL Editor do Supabase (ou via CLI):
   - `20250511000000_fase1_equipes_usuarios.sql`
   - `20250511200000_tipo_usuario_admin.sql`
   - `20250519000000_clientes.sql` ← necessário para `/clientes`
   - `20250520000000_ordens_servico_agenda.sql` ← OS + agenda_eventos
3. Crie o primeiro **admin**: usuário em Authentication e linha correspondente em `public.usuarios` (ver comentário no final da migração).

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor após build
- `npm run seed:clientes` — popula clientes de teste (40 registros; ver `scripts/seed-clientes.mjs`)

Consulte `docs/ARCHITECTURE.md`, `docs/PRODUCT_RULES.md` e `docs/DATABASE_RULES.md`.
