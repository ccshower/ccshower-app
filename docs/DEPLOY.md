# Deploy — CCSHOWER

## 1. Push para GitHub

O remote aponta para:

`https://github.com/ccshower/ccshower-app.git`

Você precisa estar autenticado com uma conta que tenha **write** no org `ccshower` (não `evoluirrh`, se essa conta não for membro).

### Windows — trocar conta GitHub

1. Abra **Painel de Controle → Contas de Usuário → Gerenciador de Credenciais → Credenciais do Windows**
2. Remova entradas `git:https://github.com` ou `github.com`
3. No terminal:

```powershell
cd c:\Users\spifo\ccshower-app
git push origin main
```

4. Faça login com a conta correta quando o Windows pedir.

Alternativa: instale [GitHub CLI](https://cli.github.com/) e rode `gh auth login`.

---

## 2. Vercel (recomendado para Next.js)

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repo `ccshower/ccshower-app`
3. Framework: **Next.js** (detectado automaticamente)
4. **Environment variables** (Production + Preview):

| Variável | Obrigatória |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (admin/usuários) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Sim (endereços) |

5. Deploy → cada push em `main` gera deploy automático.

### Google Maps em produção

No Google Cloud Console, em **API key restrictions → HTTP referrers**, adicione:

- `https://seu-dominio.vercel.app/*`
- `https://*.vercel.app/*` (previews)

---

## 3. Supabase (antes de testar em produção)

1. Rode todas as migrations em `supabase/migrations/` **em ordem** no SQL Editor.
2. Catch-ups pendentes (se ainda não aplicados):

- `supabase/scripts/catch-up-agenda-eventos-update-gestores.sql`
- `supabase/scripts/catch-up-financial-operational-rls.sql`
- `supabase/scripts/catch-up-usuario-tipo-manager.sql`

3. Em **Authentication → URL Configuration**, adicione:

- **Site URL:** `https://seu-dominio.vercel.app`
- **Redirect URLs:** `https://seu-dominio.vercel.app/**`

---

## 4. Validar build local

```powershell
npm run build
npm run start
```

Abra `http://localhost:3000`.

---

## 5. Usuários de teste

Crie no Supabase Auth + `public.usuarios`, ou use os scripts em `scripts/seed-test-*.mjs` (local apenas).
