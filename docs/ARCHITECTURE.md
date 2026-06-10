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

SMS faz parte obrigatória do fluxo operacional.

Uma etapa só libera próxima após:
- atualização status
- envio SMS
- auditoria

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