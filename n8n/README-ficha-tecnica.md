# N8N — Ficha técnica PDF (CCSHOWER)

Importar: **`ccshower-ficha-tecnica-pdf.json`**

Usa **credenciais do n8n** para auth Supabase/OpenAI + **`supabase_url`** no nó Normalizar (ou env `SUPABASE_URL` no n8n).

---

## 1. Criar credenciais no n8n (antes de importar ou ao importar)

### Supabase CCSHOWER

1. n8n → **Credentials** → **Add credential**
2. Tipo: **Supabase API**
3. Nome: `Supabase CCSHOWER`
4. Preencher:
   - **Host:** `https://SEU-PROJETO.supabase.co` (sem barra no final)
   - **Service Role Secret:** chave `service_role` (Supabase → Settings → API)

### OpenAI CCSHOWER

1. **Add credential** → **OpenAI API**
2. Nome: `OpenAI CCSHOWER`
3. **API Key:** sua chave `sk-...`

---

## 2. Importar workflow

1. **Workflows** → **Import from File** → `ccshower-ficha-tecnica-pdf.json`
2. Abra o nó **Normalizar payload** e ajuste **`supabase_url`**:
   - Cole `https://SEU-PROJETO.supabase.co` (sem barra no final), **ou**
   - Defina a env **`SUPABASE_URL`** no n8n self-hosted (tem prioridade sobre o valor fixo)
3. Vincule credenciais nos nós HTTP:
   - Nós **Supabase - …** e **Download PDF (Supabase Storage)** → `Supabase CCSHOWER`
   - Nó **OpenAI - Extrair SHOWER FITTINGS** → `OpenAI CCSHOWER`
4. Se não pedir automaticamente: abra cada nó HTTP e selecione a credencial no campo **Credential**

> **n8n 2.16+:** `$credentials.supabaseApi.host` não funciona na URL dos nós HTTP — por isso usamos `supabase_url` no Normalizar. Com `binaryDataMode: database`, o nó **PDF para base64** usa `getBinaryDataBuffer` (não leia `bin.data` direto).

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
```

**Importante:** após adicionar/alterar variáveis na Vercel, faça **Redeploy** do projeto — sem isso o upload do PDF não dispara o n8n.

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

Nada de `OPENAI_API_KEY` ou `SUPABASE_*` no Vercel — ficam só nas credenciais n8n.

---

## 5. PDF `robert.pdf`

- INSTALLATION SHEET em **imagem** (sem texto no PDF)
- Ramo OpenAI extrai **SHOWER FITTINGS** → 4 itens (ver `samples/robert-ficha-expected.json`)

---

## 6. Nós que usam cada credencial

| Credencial | Nós |
|------------|-----|
| **Supabase CCSHOWER** | Marcar processing, Download Storage, Limpar, Inserir, Buscar OS, Timeline, Marcar completed/failed |
| **OpenAI CCSHOWER** | OpenAI - Extrair SHOWER FITTINGS |

Headers Supabase (`apikey` + `Authorization`) vêm da credencial **Supabase CCSHOWER** (service role). A **base da URL** vem do campo `supabase_url` no nó Normalizar.

---

## 7. Teste

1. Credenciais criadas e vinculadas
2. Workflow **ativo**
3. Upload `robert.pdf` na OS Projeto
4. Supabase:

```sql
select sku, quantity from os_ficha_tecnica_items
where os_anexo_id = 'UUID-DO-ANEXO';
```
