# Open Route → ETA → SMS (cliente) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No clique de **Open route**, calcular ETA, avisar o **cliente** por SMS (Twilio via n8n) e abrir Google Maps directions — na **instalação** e na **visita técnica** (etapa `commercial`), com a mesma lógica.

**Architecture:** App captura GPS → `POST /api/os/[id]/open-route` valida etapa + auth → Google Routes (server) → webhook n8n → Twilio SMS **somente para `clientes.telefone`**. Maps abre com directions. Twilio fica só no n8n (padrão da ficha técnica). Sem SMS para equipes internas e sem automações de transição de etapa.

**Tech Stack:** Next.js App Router, Supabase Auth, Google Routes API, n8n webhook, Twilio SMS.

**Spec de referência:** `docs/OPEN_ROUTE_ETA_SMS.md` (já desenhado para instalação; este plano promove a visita técnica ao mesmo MVP e cancela comunicações time→time).

## Global Constraints

- **Destinatário SMS:** exclusivamente o cliente (`clientes.telefone`). Nunca sales/instaladores/times.
- **Fora de escopo:** SMS em mudança de etapa (commercial→financeiro→projeto→…); fan-out para equipe; WhatsApp; comunicação interna.
- **Gatilho único:** clique em **Open route** nas etapas `commercial` (visita técnica) e `installation`.
- **Em outras etapas:** Open route pode continuar abrindo Maps **sem** GPS/ETA/SMS (ou botão vira link simples).
- Spec base: `docs/OPEN_ROUTE_ETA_SMS.md`. Atualizar essa doc na Task 7 para refletir commercial + cliente-only.
- Twilio **não** entra no Next.js — só credencial n8n.
- Repositório sem framework de teste. Verificação = `npm run lint` + `npm run build` + checklist manual por task.
- UI em inglês; timezone operacional `America/New_York`.
- Commits por task; nunca `git add .` (há untracked alheios).
- Windows/PowerShell: encadear com `;`, não `&&`.

## File structure (previsto)

| Arquivo | Responsabilidade |
|---------|------------------|
| `src/lib/ordens-servico/cliente-directions-url.ts` | URL Google Maps `dir` com origem+destino |
| `src/lib/ordens-servico/google-routes.ts` | Compute Routes (ETA) server-side |
| `src/lib/ordens-servico/os-open-route-webhook.ts` | Dispatch webhook n8n (espelha ficha técnica) |
| `src/lib/ordens-servico/open-route-policy.ts` | Quais etapas disparam SMS (`commercial` \| `installation`) |
| `src/app/api/os/[id]/open-route/route.ts` | Auth, Routes, webhook, auditoria, dedupe |
| `src/components/ordens-servico/workspace/os-open-route-button.tsx` | Botão: GPS → API → abrir Maps |
| `src/components/ordens-servico/workspace/os-workspace-resumo.tsx` | Trocar `<a>` pelo botão |
| `n8n/ccshower-open-route-eta-sms.json` | Workflow webhook → Twilio |
| `n8n/README-open-route-eta.md` | Credenciais + templates |
| `docs/OPEN_ROUTE_ETA_SMS.md` | Spec alinhada (commercial + só cliente) |
| `.env.example` | Já tem placeholders; confirmar/completar |

---

### Task 1: Policy + URL de directions

**Files:**
- Create: `src/lib/ordens-servico/open-route-policy.ts`
- Create: `src/lib/ordens-servico/cliente-directions-url.ts`
- Modify: `src/lib/ordens-servico/visita-comercial.ts` — manter `clienteMapsUrl` (search/fallback); não remover

**Interfaces:**
- Produces: `stageTriggersClientEtaSms(stage): boolean` — true só para `commercial` e `installation`
- Produces: `clienteDirectionsUrl({ originLat, originLng, cliente })` → string | null

- [ ] **Step 1: Criar `open-route-policy.ts`**

```ts
import type { OsWorkflowStage } from "@/lib/ordens-servico/workflow";

const SMS_STAGES: ReadonlySet<OsWorkflowStage> = new Set([
  "commercial",
  "installation",
]);

/** Open route dispara ETA + SMS ao cliente nestas etapas. */
export function stageTriggersClientEtaSms(
  stage: OsWorkflowStage | null,
): boolean {
  return stage != null && SMS_STAGES.has(stage);
}

export type OpenRouteEvent =
  | "technical_visit_open_route"
  | "installer_open_route";

export function openRouteEventForStage(
  stage: OsWorkflowStage,
): OpenRouteEvent {
  return stage === "commercial"
    ? "technical_visit_open_route"
    : "installer_open_route";
}
```

- [ ] **Step 2: Criar `cliente-directions-url.ts`**

Prioridade destino (igual `clienteMapsUrl`): lat/lng → senão `endereco_formatado` encoded. Origem obrigatória para `dir`; se sem origem, retornar null (caller usa search fallback).

```ts
type Destino = {
  latitude?: number | null;
  longitude?: number | null;
  endereco_formatado?: string | null;
};

export function clienteDirectionsUrl(params: {
  originLat: number;
  originLng: number;
  cliente: Destino;
}): string | null {
  const { originLat, originLng, cliente } = params;
  let destination: string | null = null;
  if (
    cliente.latitude != null &&
    cliente.longitude != null &&
    Number.isFinite(cliente.latitude) &&
    Number.isFinite(cliente.longitude)
  ) {
    destination = `${cliente.latitude},${cliente.longitude}`;
  } else if (cliente.endereco_formatado?.trim()) {
    destination = encodeURIComponent(cliente.endereco_formatado.trim());
  }
  if (!destination) return null;
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destination}` +
    `&travelmode=driving`
  );
}
```

- [ ] **Step 3: Lint nos arquivos novos**

Run: `npx eslint src/lib/ordens-servico/open-route-policy.ts src/lib/ordens-servico/cliente-directions-url.ts`

Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ordens-servico/open-route-policy.ts src/lib/ordens-servico/cliente-directions-url.ts
git commit -m "feat(open-route): policy de etapas SMS e URL directions"
```

---

### Task 2: Google Routes (ETA) server-side

**Files:**
- Create: `src/lib/ordens-servico/google-routes.ts`
- Modify: `.env.example` — garantir `GOOGLE_MAPS_SERVER_API_KEY` documentada (já comentada)

**Interfaces:**
- Produces: `computeDrivingEta({ origin, destination })` → `{ minutos, distanciaMetros, durationSeconds } | null`
- Consome: `process.env.GOOGLE_MAPS_SERVER_API_KEY` (nunca `NEXT_PUBLIC_*`)

- [ ] **Step 1: Implementar `google-routes.ts`**

Usar Google Routes API `computeRoutes` (POST `https://routes.googleapis.com/directions/v2:computeRoutes`) com `travelMode: DRIVE`, `routingPreference: TRAFFIC_AWARE` se a conta permitir; senão `TRAFFIC_UNAWARE`.

Parsear `routes[0].duration` (ex. `"1680s"`) → minutos arredondados para cima. Se chave ausente ou falha HTTP → retornar `null` (SMS genérico sem ETA).

Não logar a API key. Field mask mínimo: `routes.duration,routes.distanceMeters`.

- [ ] **Step 2: Confirmar `.env.example`**

Garantir bloco:

```env
# GOOGLE_MAPS_SERVER_API_KEY=AIzaSy...
# N8N_WEBHOOK_OPEN_ROUTE_URL=https://seu-n8n.app/webhook/...
```

- [ ] **Step 3: Lint**

Run: `npx eslint src/lib/ordens-servico/google-routes.ts`

- [ ] **Step 4: Commit**

```bash
git add src/lib/ordens-servico/google-routes.ts .env.example
git commit -m "feat(open-route): Google Routes ETA server-side"
```

---

### Task 3: Webhook n8n Open Route

**Files:**
- Create: `src/lib/ordens-servico/os-open-route-webhook.ts`

**Interfaces:**
- Consome: padrão de `src/lib/ordens-servico/os-ficha-tecnica-webhook.ts` (`N8N_WEBHOOK_SECRET`, Bearer / `x-n8n-webhook-secret`)
- Produces: `isN8nOpenRouteWebhookConfigured()`, `dispatchOpenRouteWebhook(payload)`
- Env: `N8N_WEBHOOK_OPEN_ROUTE_URL`

- [ ] **Step 1: Criar dispatch espelhando ficha técnica**

Payload (campos obrigatórios):

```ts
export type OpenRouteWebhookPayload = {
  event: "technical_visit_open_route" | "installer_open_route";
  os_id: string;
  empresa_id: string | null;
  etapa_atual: "commercial" | "installation";
  cliente: {
    id: string;
    nome: string;
    telefone: string;
    endereco_formatado: string | null;
  };
  destino: { latitude: number | null; longitude: number | null };
  origem: {
    latitude: number;
    longitude: number;
    captured_at: string;
  } | null;
  eta: {
    minutos: number | null;
    chegada_local: string | null;
    chegada_iso: string | null;
    distancia_milhas: number | null;
    com_trafego: boolean;
  };
  equipe_nome: string | null;
  tecnico_nome: string | null; // visitante ou instalador
  timezone: "America/New_York";
};
```

Se URL não configurada → `{ ok: false, message: "..." }` sem throw (Maps ainda abre).

- [ ] **Step 2: Lint + Commit**

```bash
git add src/lib/ordens-servico/os-open-route-webhook.ts
git commit -m "feat(open-route): dispatch webhook n8n para SMS cliente"
```

---

### Task 4: API `POST /api/os/[id]/open-route`

**Files:**
- Create: `src/app/api/os/[id]/open-route/route.ts`

**Interfaces:**
- Consome: policy, google-routes, open-route-webhook, Supabase session
- Body JSON: `{ originLat, originLng, capturedAt? }`
- Response: `{ ok, mapsUrl, etaMinutes?, smsQueued, message? }`

- [ ] **Step 1: Implementar route handler**

Fluxo:

1. Auth Supabase (usuário logado); 401 se não.
2. Carregar OS + cliente + equipe; 404 se não.
3. `parseOsStage(etapa_atual)` — se **não** `stageTriggersClientEtaSms`, ainda pode devolver `mapsUrl` search/directions **sem** webhook (ou 400 — preferir: sem SMS, só URL).
4. Se etapa SMS: exigir `cliente.telefone`; se vazio → `{ ok: true, smsQueued: false, mapsUrl, message: "Customer phone missing" }` e **não** chamar n8n.
5. Se GPS presente: `computeDrivingEta` → preencher `eta`.
6. `dispatchOpenRouteWebhook` com `openRouteEventForStage`.
7. **Dedupe:** se último envio SMS open-route para mesma OS há &lt; 20 min (auditoria/timeline ou coluna/`os_eventos` — usar o mecanismo de auditoria já existente no projeto; se não houver tabela dedicada, registrar em timeline com tipo `client_eta_sms` e consultar antes). Segundo clique: Maps ok, `smsQueued: false`.
8. Montar `clienteDirectionsUrl` ou fallback `clienteMapsUrl`.
9. Retornar JSON; nunca bloquear abertura do Maps por falha Twilio/n8n.

- [ ] **Step 2: Lint build path**

Run: `npx eslint src/app/api/os/[id]/open-route/route.ts`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/os/[id]/open-route/route.ts
git commit -m "feat(open-route): API ETA + webhook SMS cliente"
```

---

### Task 5: UI — botão Open route (visita + instalação)

**Files:**
- Create: `src/components/ordens-servico/workspace/os-open-route-button.tsx`
- Modify: `src/components/ordens-servico/workspace/os-workspace-resumo.tsx` — substituir `<a href={mapsUrl}>`
- Modify (se ainda usado em campo): `src/components/ordens-servico/os-resumo-operacional.tsx` — mesma troca **somente** se esse botão for o de campo na visita; senão deixar link simples

**Interfaces:**
- Consome: `POST /api/os/${ordem.id}/open-route`
- Props: `ordemId`, `etapaAtual`, `fallbackMapsUrl: string | null`

- [ ] **Step 1: Criar botão client**

Comportamento:

1. Se `!stageTriggersClientEtaSms(etapa)` → renderizar `<a>` com `fallbackMapsUrl` (comportamento atual, sem SMS).
2. Se etapa SMS → botão: loading → `navigator.geolocation.getCurrentPosition` → POST API → `window.open(mapsUrl)` (mesmo se GPS negado: POST sem origem ou só abrir fallback + SMS genérico via API).
3. Toasts/mensagens curtas em inglês: GPS denied, phone missing, generic error. Sucesso silencioso ou toast leve.

- [ ] **Step 2: Plugar em `OsWorkspaceResumo`**

Trocar o bloco `{mapsUrl ? <a>…` pelo `<OsOpenRouteButton … />`.

- [ ] **Step 3: Verificar i18n**

Reutilizar `os.workspace.openRoute`. Adicionar chaves só se precisar de erros (`os.workspace.openRouteGpsDenied`, etc.) em `en-US.ts` e `pt-BR.ts`.

- [ ] **Step 4: `npm run lint` + `npm run build`**

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ordens-servico/workspace/os-open-route-button.tsx src/components/ordens-servico/workspace/os-workspace-resumo.tsx src/lib/i18n/locales/en-US.ts src/lib/i18n/locales/pt-BR.ts
git commit -m "feat(open-route): botão com GPS e SMS nas etapas commercial/installation"
```

---

### Task 6: Workflow n8n + Twilio (só cliente)

**Files:**
- Create: `n8n/ccshower-open-route-eta-sms.json`
- Modify: `n8n/README-open-route-eta.md`

**Precisa n8n?** Sim — padrão oficial do repo (Twilio fora do Next.js; igual ficha técnica). Alternativa Edge+Twilio direto fica fora deste plano.

- [ ] **Step 1: Desenhar workflow**

Nós:

1. Webhook POST (path dedicado, ex. `ccshower-open-route-eta`)
2. Validar secret (header)
3. IF `cliente.telefone` vazio → stop (não SMS)
4. Set message body por `event`:
   - `installer_open_route`:  
     `Hi {firstName}, our installation team is on the way to {shortAddress}. Estimated arrival: about {etaMinutes} minutes (around {etaTime}). — CC Shower`
   - `technical_visit_open_route`:  
     `Hi {firstName}, our team is on the way for your technical visit at {shortAddress}. Estimated arrival: about {etaMinutes} minutes (around {etaTime}). — CC Shower`
   - Sem ETA: variante *“will arrive shortly”* (ambos os eventos)
5. Twilio SMS: `To` = `cliente.telefone` (E.164), `From` = número Twilio da conta
6. Respond 200

- [ ] **Step 2: Documentar no README**

Credenciais Twilio no n8n; vars Vercel; como importar o JSON; teste com curl do payload de exemplo.

- [ ] **Step 3: Commit**

```bash
git add n8n/ccshower-open-route-eta-sms.json n8n/README-open-route-eta.md
git commit -m "feat(n8n): workflow Open Route ETA SMS para o cliente"
```

---

### Task 7: Docs + alinhamento ARCHITECTURE

**Files:**
- Modify: `docs/OPEN_ROUTE_ETA_SMS.md`
- Modify: `docs/ARCHITECTURE.md` (seções SMS / Google APIs)

- [ ] **Step 1: Atualizar OPEN_ROUTE_ETA_SMS.md**

Mudanças explícitas:

- Objetivo: installation **e** commercial (visita técnica).
- Destinatário: **somente cliente**.
- Remover/riscar Fase 3 “mesmo fluxo na visita comercial” — agora é MVP.
- Decisão aberta #1 fechada: commercial + installation.
- Dedupe default: **20 minutos**.
- Anotar: comunicações etapa→etapa / SMS interno **canceladas** (não implementar).

- [ ] **Step 2: Atualizar ARCHITECTURE.md**

SMS operacional = Open route → cliente. Não afirmar que “etapa só libera após SMS time”.

- [ ] **Step 3: Commit**

```bash
git add docs/OPEN_ROUTE_ETA_SMS.md docs/ARCHITECTURE.md
git commit -m "docs: Open Route SMS cliente em commercial e installation"
```

---

### Task 8: Implantação / verificação manual (não é código)

**Pré-requisitos externos (checklist):**

- [ ] Google Cloud: Routes API habilitada + billing; chave server restrita
- [ ] Vercel: `GOOGLE_MAPS_SERVER_API_KEY`, `N8N_WEBHOOK_OPEN_ROUTE_URL`, `N8N_WEBHOOK_SECRET`
- [ ] n8n: importar workflow, credencial Twilio, ativar webhook
- [ ] Twilio: número From US; compliance/TCPA (opt-in) validado com o cliente de negócio
- [ ] Telefones de teste em `clientes.telefone` em E.164 (`+1…`)

**Cenários manuais:**

| # | Cenário | Esperado |
|---|---------|----------|
| 1 | OS `installation`, Open route, GPS ok, telefone ok | SMS instalação + Maps directions |
| 2 | OS `commercial` em visita (`visit_scheduled` / `visit_in_progress`), Open route | SMS visita técnica + Maps |
| 3 | OS `project` / `financial_review`, Open route | Maps sem SMS |
| 4 | Cliente sem telefone | Maps abre; toast phone missing; sem Twilio |
| 5 | GPS negado | Maps (fallback); SMS genérico se telefone ok |
| 6 | 2º clique &lt; 20 min | Maps; sem segundo SMS |
| 7 | n8n/Twilio down | App não quebra; Maps abre |

- [ ] **Step 1: Rodar os 7 cenários em staging**
- [ ] **Step 2: Confirmar log Twilio + execução n8n**
- [ ] **Step 3: Só então liberar produção**

---

## Ordem de execução

```
Task 1 (policy + directions)
  → Task 2 (Google Routes)
  → Task 3 (webhook lib)
  → Task 4 (API)
  → Task 5 (UI)
  → Task 6 (n8n)     [pode em paralelo com 4–5 se URL já conhecida]
  → Task 7 (docs)
  → Task 8 (smoke staging)
```

## Explicitamente NÃO fazer

- SMS / WhatsApp / push para sales, instaladores ou “próximo time”
- Hooks em `prepareStageTransitionNotifications` para avisar equipes
- Bloquear avanço de etapa até SMS interno
- Colocar Twilio Account SID/Auth Token no Next.js ou Vercel do app

---

## Resposta rápida: precisa n8n?

**Sim, neste plano.** Mantém Twilio fora do app, reutiliza o padrão da ficha técnica e permite trocar texto SMS sem redeploy. Sem n8n só faria sentido um desvio arquitetural (Edge Function + Twilio) — fora do escopo acordado.
