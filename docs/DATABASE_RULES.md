# CCSHOWER — REGRAS OFICIAIS DE BANCO DE DADOS

# DIRETRIZ PRINCIPAL

O Supabase é a fonte oficial de verdade do sistema.

O frontend:
- NÃO controla regras de negócio
- NÃO controla estado final
- NÃO controla auditoria

Toda regra importante deve existir:
- no banco
- nas policies
- nas triggers
- nas funções

---

# PADRÃO OFICIAL

## Campos
Todos os campos:
- em português BR
- snake_case
- sem acentos

Exemplo:
- nome_cliente
- data_instalacao
- status_operacional

---

# IDs

Toda tabela deve possuir:

- id uuid primary key default gen_random_uuid()

---

# DATAS

Toda tabela deve possuir:

- criado_em timestamptz default now()

Sempre utilizar:
- timestamptz
- timezone America/Florida

---

# AUDITORIA

Toda movimentação importante deve gerar auditoria.

Exemplos:
- mudança status
- mudança etapa
- movimentação calendário
- estoque
- financeiro
- SMS
- uploads

---

# SOFT DELETE

Evitar deletar registros importantes.

Preferir:
- ativo boolean
ou
- deletado_em timestamptz

---

# EVENTOS

Eventos NÃO representam apenas agenda.

Eventos representam:
- visita
- medição
- instalação
- operação logística

Todo evento deve possuir:
- cliente
- equipe
- etapa
- status
- endereço
- latitude
- longitude

---

# PIPELINE

IMPORTANTE:
Etapa != Status

## Etapas
- comercial
- projeto
- financeiro
- instalacao

## Status
- scheduled
- blocked
- completed
- waiting_customer
- pending_payment

---

# EQUIPES

Todo usuário pertence a uma equipe.

Usuário comum:
- vê apenas própria equipe

Gerente:
- pode visualizar todas equipes

---

# PERMISSÕES

Utilizar booleans inicialmente.

Exemplo:
- pode_editar_agenda
- pode_ver_todas_equipes
- pode_gerenciar_estoque

Evitar RBAC complexo no MVP.

---

# REALTIME

Tabelas operacionais devem possuir realtime.

Exemplos:
- calendar_events
- crashes
- financeiro
- estoque

---

# STORAGE

Estrutura oficial:

/customers
/projects
/measurements
/installations
/payments

---

# NOMES PADRÃO ARQUIVOS

Exemplo:
CC-2026-000182-before.jpg
CC-2026-000182-after.jpg

---

# ESTOQUE

Separar:
- estoque_fisico
- estoque_reservado
- estoque_disponivel

Projeto:
- reserva estoque

Instalação:
- baixa estoque

---

# FINANCEIRO

Financeiro deve suportar:
- pagamentos parciais
- múltiplos métodos
- saldo pendente

Cliente deve possuir:
- conta corrente
- histórico financeiro

## Staging: pagamento informado na visita comercial

Colunas em `ordens_servico` (inglês, snake_case):
- `visit_payment_received`, `visit_payment_amount`, `visit_payment_method`, `visit_payment_notes`
- `visit_payment_method` ∈ `cash`, `check`, `debit_card`, `credit_card`, `zelle`

Anexo: `os_anexos.tipo = payment_receipt` (imagem ou PDF).

**Integração futura:** o módulo financeiro deve ler esses campos na OS ao revisar `financial_review` e promover para lançamento oficial; saldo pendente não deriva destas colunas.

---

# SMS

SMS faz parte do fluxo operacional.

Mudança etapa:
- pode disparar SMS
- deve gerar auditoria

---

# RLS

Toda tabela operacional deve utilizar RLS.

Usuário comum:
- acessa apenas dados da própria equipe

Gerente:
- pode visualizar tudo

---

# TRIGGERS

Preferir triggers para:
- auditoria
- timestamps
- sincronizações
- logs operacionais

---

# FRONTEND

Frontend deve:
- consumir banco
- refletir estado realtime

Frontend NÃO deve:
- centralizar regra crítica
- depender de estado local para operação

---

# IMPORTANTE

O CCSHOWER é um sistema operacional realtime.

A arquitetura deve priorizar:
- rastreabilidade
- clareza
- segurança
- operação mobile
- consistência operacional

# INDEXAÇÃO

Todas as tabelas operacionais devem possuir índices apropriados.

Objetivo:
- melhorar performance
- melhorar realtime
- melhorar filtros
- melhorar calendário
- melhorar mobile

---

# INDEXAR PRINCIPALMENTE

## IDs relacionamento
- cliente_id
- equipe_id
- usuario_id
- evento_id
- projeto_id

---

# DATAS

Campos:
- criado_em
- data_evento
- data_instalacao
- atualizado_em

---

# STATUS

Campos:
- status
- etapa
- ativo

---

# FINANCEIRO

Campos:
- status_pagamento
- cliente_id
- vencimento

---

# ESTOQUE

Campos:
- item_id
- estoque_disponivel
- estoque_reservado

---

# AUDITORIA

Campos:
- usuario_id
- criado_em
- tipo_evento

---

# IMPORTANTE

Sempre criar índices:
- junto da criação da tabela
- evitando crescimento sem indexação

---

# EXEMPLO

create index idx_eventos_equipe
on calendar_events(equipe_id);

create index idx_eventos_data
on calendar_events(data_evento);

create index idx_eventos_status


# RELACIONAMENTOS

O sistema deve utilizar relacionamentos reais entre tabelas.

Evitar:
- IDs soltos
- dados duplicados
- texto manual para relacionamento

Utilizar:
- foreign keys
- references
- integridade relacional

---

# EXEMPLOS

usuarios.equipe_id
→ equipes.id

calendar_events.cliente_id
→ clientes.id

calendar_events.equipe_id
→ equipes.id

projetos.cliente_id
→ clientes.id

financeiro.cliente_id
→ clientes.id

---

# IMPORTANTE

Toda entidade operacional deve possuir relacionamentos reais.

O frontend NÃO deve controlar relacionamento manualmente.

---

# PADRÃO

Sempre utilizar:
references public.nome_tabela(id)

Exemplo:

equipe_id uuid references public.equipes(id)