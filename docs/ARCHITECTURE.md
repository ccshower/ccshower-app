# CCSHOWER — ARQUITETURA OFICIAL

## VISÃO GERAL

O CCSHOWER é um sistema operacional completo para controle de instalações de banheiro.

O sistema NÃO é apenas um calendário.

O sistema é:
- operacional
- logístico
- técnico
- financeiro
- mobile-first
- auditável

O calendário é apenas a visualização operacional do pipeline.

---

# STACK OFICIAL

## Frontend
- React
- Next.js
- TailwindCSS
- PWA

## Backend
- Supabase
- PostgreSQL
- Realtime
- Auth
- Storage
- RLS

## Automações
- N8N
- Twilio SMS
- BILL API

## APIs externas
- Google Places Autocomplete
- Google Places Details
- Google Routes API
- Google Maps Links

---

# DIRETRIZES IMPORTANTES

## IMPORTANTE
O sistema deve SEMPRE:
- atualizar banco realtime
- gerar auditoria
- respeitar permissões
- ser mobile-first
- funcionar perfeitamente no celular

---

# FLUXO OFICIAL DA EMPRESA

## 1. LEAD
Cliente entra em contato.

## 2. VISITA TÉCNICA
Comercial:
- agenda visita
- usa rota Google
- tira fotos
- faz medições
- registra observações

## 3. PROJETO
Projeto:
- cria ficha técnica
- define materiais
- reserva estoque

## 4. FINANCEIRO
Financeiro:
- libera instalação
- controla pagamentos

## 5. INSTALAÇÃO
Equipe:
- visualiza ficha técnica
- usa rota Google
- executa instalação
- tira foto final
- realiza cobrança se necessário

---

# PIPELINE

## ETAPAS
- comercial
- projeto
- financeiro
- instalacao

## STATUS
- scheduled
- waiting_customer
- blocked
- completed
- pending_payment
- financial_released

IMPORTANTE:
Etapa != Status

---

# CALENDÁRIO

O calendário é o centro operacional do sistema.

## Funcionalidades obrigatórias
- month view
- week view
- day view
- drag and drop
- realtime
- auditoria

## MOBILE
Hierarquia:
1. Dia
2. Semana
3. Mês

---

# DRAG AND DROP

Toda movimentação:
- atualiza banco
- gera auditoria
- pode disparar SMS

Permissões:
- usuário comum NÃO pode mover eventos
- gerente pode mover eventos

---

# EQUIPES

Cada evento pertence a uma equipe.

Usuário comum:
- vê apenas equipe dele

Gerente:
- vê todas equipes

---

# GOOGLE APIs

Uso obrigatório:
- autocomplete endereço
- latitude/longitude
- abertura Google Maps
- cálculo rotas

**Implementado:** ETA no clique **Open route** (etapas `commercial` e `installation`) → webhook n8n → SMS Twilio **ao cliente**. Ver `docs/OPEN_ROUTE_ETA_SMS.md`.

---

# EVENTOS

Eventos NÃO são apenas agenda.

Eventos representam:
- visitas
- medições
- instalações
- operação logística

Todo evento deve possuir:
- cliente
- endereço
- equipe
- status
- etapa
- observações
- responsável

---

# UPLOADS

## Medição
- fotos local
- observações técnicas

## Instalação
- foto final obrigatória

Upload deve abrir câmera diretamente no mobile.

---

# ESTOQUE

O sistema possui:
- estoque físico
- estoque reservado
- estoque disponível

Projeto:
- reserva estoque

Instalação:
- baixa estoque

---

# FINANCEIRO

Financeiro é operacional e flexível.

Cobrança pode ocorrer:
- lead
- visita técnica
- financeiro
- instalação

O sistema deve permitir:
- pagamentos parciais
- múltiplos métodos
- saldo pendente

Cada cliente possui:
- conta corrente
- histórico financeiro

---

# BILL

Cobranças serão geradas via:
- N8N
- BILL API

---

# SMS

SMS operacional = **Open route → cliente**.

Quando o técnico clica **Open route** nas etapas `commercial` (visita técnica) ou `installation`, o sistema calcula ETA e envia SMS ao **cliente** via n8n + Twilio. Especificação: `docs/OPEN_ROUTE_ETA_SMS.md`.

Transições de etapa **não** dependem de SMS interno entre times — comunicações etapa→etapa e SMS para equipes foram **canceladas** (fora de escopo).

Toda ação relevante gera auditoria.

---

# DASHBOARD ADMIN

Dashboard obrigatório com:
- crashes
- instalações
- visitas
- financeiro
- estoque crítico

---

# AUDITORIA

Tudo deve gerar auditoria:
- movimentação calendário
- mudança status
- upload
- estoque
- financeiro
- SMS

---

# TIMEZONE

Timezone oficial:
America/Florida

---

# STORAGE

Estrutura padrão:

/customers
/projects
/measurements
/installations
/payments

---

# DIRETRIZ FINAL

O CCSHOWER é um sistema operacional de campo.

A prioridade do projeto é:
- operação
- velocidade
- clareza
- rastreabilidade
- mobile
- logística

---

# ROADMAP — AMBIENTES POR OS (MULTI-BANHEIRO)

## Fase 1 — Comercial (concluída)
- Tabela `os_ambientes` + `os_anexos.os_ambiente_id`
- Specs em texto livre, fotos por ambiente, valor parcial com soma editável
- Fotos agrupadas no contexto operacional e na etapa Projeto

## Fase 2 — Financeiro (pendente)
- Validação / breakdown financeiro por ambiente (se necessário)

## Fase 3 — Projeto: CNC por ambiente (em andamento)
- Upload de Desenho Técnico (`tipo = cnc_file`) com `os_ambiente_id`
- UI na etapa Projeto: um card por banheiro, lista de arquivos + botão de upload
- Contexto operacional: CNC agrupado por ambiente (somente leitura)
- **Sem migration nova** — reutiliza coluna `os_anexos.os_ambiente_id` da Fase 1

## Fase 4 — Instalação parcial (pendente)
- Status por ambiente, conclusão parcial da OS

## Futuro — Ficha técnica via IA (N8N, não implementar agora)

**Objetivo:** ao subir CNC em PDF, extrair automaticamente a ficha técnica embutida no arquivo e persistir em `os_ambientes.especificacoes` (ou campo dedicado).

**Fluxo proposto:**
1. App faz upload do PDF → `os_anexos` (com `os_ambiente_id`) + Storage
2. Webhook Supabase (insert em `os_anexos` where `tipo = cnc_file` e `mime = pdf`) → N8N
3. Agente IA no N8N: OCR / leitura estruturada do PDF → JSON (medidas, vidro, ferragens, recortes…)
4. N8N chama API/Edge Function ou `PATCH` direto em `os_ambientes` com texto normalizado
5. Auditoria: evento `cnc_ficha_importada` na timeline da OS

**Pré-requisitos técnicos:**
- `os_ambiente_id` no anexo (Fase 3) — saber **qual banheiro** recebe a ficha
- Idempotência por `os_anexos.id` (reprocessamento seguro)
- Fallback manual: specs continuam editáveis na visita comercial / projeto

**Fora de escopo imediato:** validação humana obrigatória antes de gravar, lista de separação por ambiente, estoque.