# CCSHOWER — REGRAS OFICIAIS DE PRODUTO

# VISÃO DO PRODUTO

O CCSHOWER NÃO é:
- CRM genérico
- agenda simples
- dashboard administrativo comum

O CCSHOWER é:
- sistema operacional de campo
- sistema logístico
- sistema técnico
- sistema operacional mobile

A experiência deve transmitir:
- rapidez
- controle
- clareza
- operação
- confiabilidade

---

# DIRETRIZ VISUAL

A interface deve parecer:
- limpa
- operacional
- objetiva
- rápida

Evitar:
- excesso de gráficos
- excesso de animações
- excesso de informação

O foco deve ser:
- operação do dia
- ações rápidas
- visualização rápida

---

# MOBILE FIRST

O sistema é mobile-first.

A experiência mobile é prioridade máxima.

---

# MOBILE — HIERARQUIA OFICIAL

## Abrir no celular:
1. Dia
2. Semana
3. Mês

O usuário deve abrir o sistema e imediatamente visualizar:
- obrigações do dia
- rota
- visitas
- instalações

---

# CALENDÁRIO

O calendário é o centro operacional do sistema.

O calendário deve:
- lembrar Google Calendar
- possuir drag and drop
- funcionar realtime
- ser extremamente rápido

---

# DRAG AND DROP

Toda movimentação:
- atualiza banco
- gera auditoria
- respeita permissões

Usuário sem permissão:
- NÃO pode mover eventos

---

# EVENTOS

Eventos devem funcionar como mini-cards operacionais.

Todo evento deve mostrar:
- cliente
- horário
- status
- equipe
- etapa
- prioridade

---

# EQUIPES

Eventos devem possuir:
- cores por tipo
- tons diferentes por equipe

Exemplo:
- instalação = vermelho
- comercial = azul

Equipe A:
- vermelho claro

Equipe B:
- vermelho médio

Equipe C:
- vermelho escuro

---

# VISÃO USUÁRIO

Usuário comum:
- vê apenas equipe dele

Gerente:
- vê todas equipes

---

# DASHBOARD ADMIN

Admin deve visualizar:
- crashes ativos
- instalações mês
- visitas mês
- fechamento comercial
- financeiro
- estoque crítico

Crashes devem ficar no topo da tela.

---

# CRASHES

Crash representa problema operacional.

Crash deve possuir:
- destaque visual
- prioridade
- responsável
- etapa relacionada

---

# UPLOADS MOBILE

Uploads devem:
- abrir câmera diretamente
- funcionar rápido
- possuir preview

Evitar:
- upload complexo
- múltiplas etapas

---

# FOTOS

## Medição
Fotos:
- local
- medidas
- problemas

## Instalação
Foto final obrigatória.

---

# UX OPERACIONAL

O sistema deve priorizar:
- velocidade
- poucos cliques
- operação rápida
- clareza visual

---

# MODAIS

Modais devem:
- abrir rápido
- possuir foco operacional
- funcionar bem mobile

---

# EQUIPE OPERACIONAL

Toda Work Order pertence a uma equipe (`equipe_id`, `equipe_atual_id`).

- Cadastro de cliente exige **equipe operacional** (frontend, server action e trigger no banco em novos registros).
- Ao criar cliente, a OS inicial herda a mesma equipe.
- Ownership operacional é **por equipe** — usuário individual só para auditoria.
- Usuário comum vê cards da própria equipe (RLS); gerente/admin vê todas.
- Cliente ou OS legada sem equipe: exibir badge **SEM EQUIPE** (não ocultar).

---

# DATAS RETROATIVAS (ADMIN)

Usuários **comum**, **manager** e equipes de campo:
- agenda com limite de **1 dia** no passado (`AGENDA_RETRO_DIAS`);
- data prevista de material **não** pode ser anterior a hoje;
- horários já passados no dia de hoje ficam indisponíveis.

Usuário **admin** (`tipo_usuario = admin`):
- pode agendar **visitas**, **instalações** e **previsão de material** em **qualquer data passada** (lançamento atrasado);
- validação no **servidor** (`usuarioPodeLancarDatasRetroativas`) — a UI só libera o calendário; o backend é a fonte de verdade.

---

# FINANCEIRO

Instalação deve visualizar:
- saldo pendente
- precisa cobrar?

Instalação NÃO deve visualizar:
- negociações internas
- detalhes financeiros administrativos

## Captura na visita comercial (staging operacional)

Na etapa **commercial**, o time pode registrar o que ocorreu no local:
- `ordens_servico.visit_payment_received`, `visit_payment_amount`, `visit_payment_method`, `visit_payment_notes`
- comprovante em `os_anexos` com `tipo = payment_receipt`

Isso **não** quita saldo, **não** aprova pagamento e **não** substitui o módulo financeiro.

**Quando o financeiro existir, é obrigatório:**
- na etapa `financial_review` (e fluxo de cobrança), **exibir e revisar** essa captura antes de lançar o recebimento oficial;
- permitir **promover** (aceitar/ajustar/ignorar) para o ledger financeiro (tabela de recebimentos a definir);
- calcular **saldo a cobrar** apenas com recebimentos **aprovados** pelo financeiro — nunca usar `visit_payment_*` como valor oficial de saldo.

A captura comercial é **entrada sugerida + comprovante**; a fonte de verdade de saldo e cobrança continua sendo o financeiro.

---

# SMS

SMS é parte obrigatória do fluxo.

Mudança de etapa:
- pode disparar SMS
- gera auditoria

---

# PERFORMANCE

A aplicação deve:
- carregar rápido
- funcionar bem mobile
- evitar telas pesadas

---

# PWA

O sistema deve funcionar como APP.

Prioridades:
- responsividade
- câmera
- mobile
- operação em campo

---

# IDENTIDADE DO CCSHOWER

O sistema deve parecer:
- ferramenta operacional real
- sistema de equipe externa
- sistema logístico

O sistema NÃO deve parecer:
- CRM genérico
- dashboard financeiro comum
- template administrativo padrão