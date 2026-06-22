# N8N — Ficha técnica PDF (CCSHOWER)

Importar: **`ccshower-ficha-tecnica-pdf.json`**

Usa **credenciais do n8n** para auth Supabase/OpenAI + **`supabase_url`** no nó Normalizar (ou env `SUPABASE_URL` no n8n).

---

## 1. Criar credenciais no n8n (antes de importar ou ao importar)

### ccshower_supabase

1. n8n → **Credentials** → **Add credential** (ou use a existente)
2. Tipo: **Supabase API**
3. Nome: `ccshower_supabase`
4. Preencher:
   - **Host:** `https://gilnvnzooeanzcaktrlg.supabase.co` (sem barra no final)
   - **Service Role Secret:** chave `service_role` (Supabase → Settings → API)

### openai_spifo

1. **Add credential** → **OpenAI API**
2. Nome: `openai_spifo`
3. **API Key:** sua chave `sk-...`

---

## 2. Importar workflow

1. **Workflows** → **Import from File** → `ccshower-ficha-tecnica-pdf.json`
2. O nó **Normalizar payload** já traz **`supabase_url`**:
   - `https://gilnvnzooeanzcaktrlg.supabase.co` (ou env `SUPABASE_URL` no n8n)
3. Credenciais esperadas no import:
   - Nós **Supabase - …** e **Download PDF (Supabase Storage)** → `ccshower_supabase`
   - Nó **OpenAI - Extrair SHOWER FITTINGS** → `openai_spifo`
4. Se não pedir automaticamente: abra cada nó HTTP e selecione a credencial no campo **Credential**

> **n8n 2.16+:** `$credentials.supabaseApi.host` não funciona na URL dos nós HTTP — por isso usamos `supabase_url` no Normalizar. No ramo OpenAI, **Download PDF (OpenAI)** baixa o PDF de novo; **PDF para base64** usa `getBinaryDataBuffer(0, 'data')` no input (não leia binário de outro nó).

---

## 3. Modelo OpenAI (opcional)

No nó **Normalizar payload**, campo `openai_model`:

- Padrão: `gpt-4o` (recomendado para `robert.pdf`)
- Alternativa econômica: `gpt-4o-mini` (teste antes em produção)

---

## 4. Webhook → Vercel

Copie a **Production URL** do nó **Webhook CCSHOWER** (não use a URL de *Test*):

```env
N8N_WEBHOOK_FICHA_TECNICA_URL=https://SEU-N8N/webhook/ccshower-ficha-tecnica
APP_BASE_URL=https://seu-app.vercel.app
N8N_WEBHOOK_SECRET=mesmo-token-longo-aleatorio
```

O segredo fica **só na Vercel**. O app envia `callback_secret` no body do webhook — o n8n **não precisa** de `$env` (muitos servidores bloqueiam `access to env vars denied`).

No nó **Normalizar payload**, `supabase_url`, `callback_url` e `callback_secret` devem aparecer **verdes** na execução.

**Importante:** após adicionar/alterar variáveis na Vercel, faça **Redeploy** — sem isso o upload não envia `callback_url` / `callback_secret`.

Só **arquivos PDF** disparam o workflow (`.dwg`, `.dxf`, etc. são ignorados).

Diagnóstico rápido no Supabase após upload de PDF:

```sql
select id, nome_arquivo, mime_type, ficha_import_status, ficha_import_error
from os_anexos
where tipo = 'cnc_file'
order by criado_em desc
limit 5;
```

- `ficha_import_status = pending` → upload ok, aguardando n8n
- `skipped` → `N8N_WEBHOOK_FICHA_TECNICA_URL` ausente no deploy
- `processing` / `completed` / `failed` → n8n recebeu e processou (ou falhou)

Nada de `OPENAI_API_KEY` ou `SUPABASE_*` no Vercel — ficam só nas credenciais n8n (exceto `N8N_WEBHOOK_SECRET` e URLs acima).

---

## 5. Gravação no banco (callback do app)

Após extrair os itens, o n8n **não** insere mais direto em `os_ficha_tecnica_items`. Ele chama:

`POST {APP_BASE_URL}/api/webhooks/n8n/ficha-tecnica`

com `Authorization: Bearer {N8N_WEBHOOK_SECRET}`. O app usa `SUPABASE_SERVICE_ROLE_KEY` e grava itens + marca o anexo `completed`.

Se `count(*)` em `os_ficha_tecnica_items` continuar 0:

1. Vercel tem `APP_BASE_URL` e `N8N_WEBHOOK_SECRET`? (redeploy após alterar)
2. **Normalizar payload** — `callback_secret` verde e preenchido?
3. **App - Callback ficha** — HTTP **200** com `{"ok":true,"item_count":N}` (401 = secret ausente na Vercel)

---

## 6. PDF `robert.pdf`

- INSTALLATION SHEET em **imagem** (sem texto no PDF)
- Ramo OpenAI extrai **SHOWER FITTINGS** → 4 itens (ver `samples/robert-ficha-expected.json`)

---

## 7. Nós que usam cada credencial

| Credencial | Nós |
|------------|-----|
| **ccshower_supabase** | Marcar processing, Download Storage, Limpar itens antigos |
| **openai_spifo** | OpenAI - Extrair SHOWER FITTINGS |
| **callback_secret** (vem do webhook Vercel) | App - Callback ficha / App - Callback falha |

Headers Supabase (`apikey` + `Authorization`) vêm da credencial **ccshower_supabase** (service role). A **base da URL** vem do campo `supabase_url` no nó Normalizar.

---

## 8. Teste

1. Credenciais criadas e vinculadas
2. Workflow **ativo**
3. Upload `robert.pdf` na OS Projeto
4. Supabase:

```sql
select sku, quantity from os_ficha_tecnica_items
where os_anexo_id = 'UUID-DO-ANEXO';
```
