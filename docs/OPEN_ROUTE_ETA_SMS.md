# Open Route → ETA → SMS (n8n + Twilio)

**Status:** implementado — etapas `commercial` (visita técnica) e `installation`.

**Objetivo:** quando o técnico clicar em **Open route** nas etapas **Commercial** (visita técnica) ou **Installation** (workspace `/os/[id]`), o sistema deve:

1. Calcular tempo estimado de chegada (ETA) até o endereço do cliente.
2. Disparar webhook para **n8n**.
3. n8n envia **SMS via Twilio** ao **cliente** com a estimativa.
4. Abrir Google Maps com rota de navegação para o técnico.

**Destinatário SMS:** exclusivamente o cliente (`clientes.telefone`). Sem SMS para equipes internas, instaladores ou times.

**Fora de escopo (cancelado):** comunicações etapa→etapa, SMS interno entre times, fan-out para equipe, automações de transição de etapa. Não implementar.

Alinhado a `docs/ARCHITECTURE.md` (SMS operacional, Google Routes API, auditoria).

---

## Comportamento implementado

| Item | Situação |
|------|----------|
| Botão **Open route** | Componente `OsOpenRouteButton` com handler assíncrono |
| Componente | `src/components/ordens-servico/workspace/os-open-route-button.tsx` |
| Etapas com ETA + SMS | `commercial` e `installation` (`open-route-policy.ts`) |
| Outras etapas | Maps abre sem GPS/ETA/SMS (link simples) |
| URL gerada | Google Maps **directions** com origem GPS + destino cliente |
| GPS do técnico | `navigator.geolocation` no clique |
| Cálculo de ETA | Google Routes API (server-side) |
| Webhook / SMS | `POST /api/os/[id]/open-route` → n8n → Twilio → cliente |
| Dedupe SMS | **20 minutos** por OS (segundo clique abre Maps, sem novo SMS) |

### Prioridade da URL do cliente

1. `cliente.google_maps_url` (Places)
2. `latitude` + `longitude`
3. `endereco_formatado` (query encoded)

---

## Por que o ETA exige API server-side

Abrir o Google Maps **não devolve** duração ou horário de chegada para o app. O ETA só existe dentro do app Maps.

Para obter ETA programaticamente:

- **Origem:** coordenadas do técnico no momento do clique (`navigator.geolocation`).
- **Destino:** `cliente.latitude` / `cliente.longitude` (ideal) ou geocode do endereço.
- **API:** Google **Routes API** (Compute Routes) no **servidor**.

Padrão de webhook n8n: `src/lib/ordens-servico/os-open-route-webhook.ts` + `N8N_WEBHOOK_*` em `.env`.

---

## Fluxo

```mermaid
sequenceDiagram
  participant App as App (técnico)
  participant API as Next.js API
  participant Google as Google Routes API
  participant N8N as n8n
  participant Twilio as Twilio
  participant Cliente as Cliente

  App->>App: Clique Open route
  App->>App: navigator.geolocation (origem)
  App->>API: POST /api/os/{id}/open-route
  API->>API: Auth + etapa commercial|installation + telefone cliente
  API->>Google: Rota origem → destino (driving)
  Google-->>API: duration / traffic
  API->>N8N: Webhook payload (ETA + cliente + OS)
  API-->>App: ok + mapsUrl + eta resumo
  App->>App: window.open Google Maps directions
  N8N->>Twilio: Enviar SMS
  Twilio->>Cliente: Mensagem com ETA
```

---

## Dados disponíveis no banco / app

| Campo | Uso |
|-------|-----|
| `clientes.telefone` | Destino do SMS (Twilio) — **único destinatário** |
| `clientes.nome` | Personalização da mensagem |
| `clientes.endereco_formatado` | Texto no SMS / fallback destino |
| `clientes.latitude`, `clientes.longitude` | Destino da rota |
| `clientes.google_maps_url` | Abrir Maps (directions) |
| `ordens_servico.id`, `etapa_atual` | Validação e auditoria |
| `equipes.nome` | Contexto no SMS |
| `usuarios.nome` | Nome do técnico → payload `tecnico_nome` |

Timezone operacional: `America/New_York` (`OPERATIONAL_TZ` em `src/lib/ordens-servico/datetime.ts`).

---

## Arquivos principais

### Frontend

- `src/components/ordens-servico/workspace/os-open-route-button.tsx` — GPS → API → abrir Maps
- `src/components/ordens-servico/workspace/os-workspace-resumo.tsx` — integração do botão
- Estados de UI: loading, erro GPS negado, erro sem telefone, sucesso silencioso

### Backend

- `POST /api/os/[id]/open-route` — auth, Routes API, webhook, auditoria, dedupe
- Valida `etapa_atual === 'commercial' | 'installation'`
- Dedupe: não reenviar SMS se novo clique em **&lt; 20 min** (mesma OS)

### Lib

- `src/lib/ordens-servico/open-route-policy.ts` — etapas que disparam SMS
- `src/lib/ordens-servico/google-routes.ts` — Compute Routes / parse duration
- `src/lib/ordens-servico/os-open-route-webhook.ts` — payload + dispatch n8n
- `src/lib/ordens-servico/cliente-directions-url.ts` — URL Google Maps `dir`

### n8n

- Workflow: `n8n/ccshower-open-route-eta-sms.json`
- README: `n8n/README-open-route-eta.md`
- Trigger: Webhook POST
- Nó Twilio: SMS com template EN (cliente EUA)

### Variáveis de ambiente

```env
# Google Routes — somente servidor (não expor ao browser)
GOOGLE_MAPS_SERVER_API_KEY=AIzaSy...

# n8n — disparo ao clicar Open route
N8N_WEBHOOK_OPEN_ROUTE_URL=https://seu-n8n.app/webhook/...
N8N_WEBHOOK_SECRET=...

# Twilio — configurar como credencial no n8n (não no Next.js)
# TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
```

---

## Payload — webhook app → n8n

```json
{
  "event": "installer_open_route",
  "os_id": "uuid",
  "empresa_id": "uuid",
  "etapa_atual": "installation",
  "cliente": {
    "id": "uuid",
    "nome": "STEPHANIE C.",
    "telefone": "+19045551234",
    "endereco_formatado": "3178 WAVERING LN, MIDDLEBURG, FL 32068"
  },
  "destino": {
    "latitude": 30.12,
    "longitude": -81.86
  },
  "origem": {
    "latitude": 30.05,
    "longitude": -81.72,
    "captured_at": "2026-06-09T18:30:00.000Z"
  },
  "eta": {
    "minutos": 28,
    "chegada_local": "2:45 PM",
    "chegada_iso": "2026-06-09T18:45:00-04:00",
    "distancia_milhas": 12.4,
    "com_trafego": true
  },
  "equipe_nome": "Design & Projects",
  "tecnico_nome": "John Smith",
  "timezone": "America/New_York"
}
```

- `event`: `technical_visit_open_route` na etapa `commercial`; `installer_open_route` na etapa `installation`.
- Campo do técnico: **`tecnico_nome`** (não `instalador_nome`).

Header de autenticação: `Authorization: Bearer {N8N_WEBHOOK_SECRET}`.

---

## Template SMS (inglês — cliente EUA)

> Hi {firstName}, our installation team is on the way to {shortAddress}. Estimated arrival: about {etaMinutes} minutes (around {etaTime}). — CC Shower

Variações:

- Visita técnica (`commercial`): ajustar copy para "technical visit" quando aplicável.
- Sem GPS / sem ETA: *"Our team is heading to your address and will arrive shortly."*
- Sempre usar linguagem aproximada (*about*, *around*) — trânsito muda.

---

## Casos de borda

| Cenário | Comportamento |
|---------|---------------|
| GPS negado pelo técnico | Abrir Maps sem origem; SMS genérico sem minutos |
| Cliente sem `telefone` | Bloquear SMS; toast no app; ainda abrir Maps |
| Cliente sem lat/lng | Geocoding server-side antes da rota |
| Clique repetido | Dedupe **20 min** — Maps ok, sem segundo SMS |
| Técnico offline | Falha graciosa; Maps pode abrir via fallback |
| Endereço fora da Flórida | Mesma lógica; validar unidade operacional |

---

## Fases de implementação

### Fase 1 — MVP (concluída)

- Botão + GPS + API Routes + webhook n8n + SMS Twilio + abrir directions.
- Etapas **`commercial`** (visita técnica) e **`installation`**.
- Destinatário: **somente cliente**.

### Fase 2 — Operação

- Timeline / auditoria obrigatória (`ARCHITECTURE.md`).
- Dedupe SMS (20 min — implementado).
- Métricas no Centro Operacional (opcional).

### Fase 3 — Refino

- ETA com tráfego em tempo real (parcialmente via Routes API).
- Fallback origem = endereço da unidade (depósito).
- ~~Mesmo fluxo na visita comercial (`commercial`)~~ — **promovido ao MVP**.

---

## Referências no repositório

| Arquivo | Papel |
|---------|--------|
| `src/components/ordens-servico/workspace/os-open-route-button.tsx` | Botão Open route (UI) |
| `src/lib/ordens-servico/open-route-policy.ts` | Etapas `commercial` \| `installation` |
| `src/lib/ordens-servico/cliente-directions-url.ts` | URL directions |
| `src/lib/ordens-servico/os-open-route-webhook.ts` | Dispatch n8n |
| `src/lib/ordens-servico/google-routes.ts` | Compute Routes |
| `src/app/api/os/[id]/open-route/route.ts` | API route |
| `n8n/ccshower-open-route-eta-sms.json` | Workflow n8n |
| `n8n/README-open-route-eta.md` | Credenciais + templates |
| `docs/ARCHITECTURE.md` | SMS, Google APIs, auditoria |

---

## Decisões fechadas

1. ~~SMS só em **installation** ou também em **commercial**?~~ → **Ambas** (`commercial` + `installation`).
2. ~~Janela de **dedupe**?~~ → **20 minutos** (default).
3. ETA com ou sem **tráfego** (custo/latência Google)? — em uso via Routes API; revisar custo se necessário.
4. Twilio **From** number e opt-in/compliance (TCPA) — revisar com cliente.
5. Registrar evento em `agenda_eventos` ou tabela de auditoria dedicada? — via timeline/auditoria existente.

---

*Última revisão: ago/2026 — commercial + installation, SMS somente cliente, dedupe 20 min.*
