# Edição completa do cliente na primeira visita

**Data:** 2026-07-21
**Status:** Aprovado pelo usuário (design), pendente revisão da spec escrita

## Problema

No cadastro por telefone, o atendente às vezes registra o nome do cliente errado (ou outros dados, como email). O erro só é percebido na primeira visita, mas o workspace da OS não oferece edição do cliente — hoje só o nome é editável durante a visita (`OsClienteNomeVisitaField`). A tela de Customers (Admin → Customers) já possui edição completa via ícone de lápis, mas é restrita a admin/criador.

## Decisões de escopo (confirmadas com o usuário)

1. **Quando editar:** nos dois momentos da primeira visita — agendamento (OS comercial em `NO VISIT`) e execução (`VISIT SCHEDULED` / `VISIT IN PROGRESS`). Depois que a primeira visita termina, a edição some do workspace.
2. **Admin:** não é afetado pela trava — continua editando tudo, a qualquer momento, pela tela de Customers.
3. **Campos editáveis na primeira visita:** somente dados cadastrais — nome, telefone, email, tipo de cliente, endereço (com busca Google Places), origem do lead e observações. **Fora do escopo:** equipe, contractor e status ativo/inativo.

## Solução (Opção 2 ajustada — reaproveitar o formulário existente)

### UI

- Reaproveitar o `ClienteForm` (`src/app/admin/clientes/clientes-client.tsx`) num modal "Edit customer" dentro do workspace da OS (`/os/[id]`), em dois pontos:
  - Tela de agendamento (`OsWorkspaceScheduling` / `AgendarVisitaForm`): botão "Edit customer" no cartão do cliente.
  - Tela de execução da visita comercial: botão "Edit customer" substituindo o campo avulso de nome (`OsClienteNomeVisitaField`), para não existirem dois caminhos de edição do nome.
- O `ClienteForm` ganha um modo "primeira visita" que oculta equipe, contractor e ativo/inativo. Para isso, o formulário deve ser extraído para um componente compartilhado (hoje vive dentro de `clientes-client.tsx`).
- O botão só aparece quando a OS está na etapa comercial em `no_visit`, `visit_scheduled` ou `visit_in_progress` (mesmos predicados de `src/lib/ordens-servico/visita-comercial.ts`).

### Backend

- Nova server action `atualizarClientePrimeiraVisita` (padrão de `salvarNomeClienteVisitaComercial` em `visita-comercial-actions.ts`):
  - Recebe o id da OS + campos cadastrais permitidos (lista fechada; ignora qualquer outro campo).
  - Valida no servidor que a OS está na etapa `commercial` com `status_atual` em `no_visit` / `visit_scheduled` / `visit_in_progress`; caso contrário, recusa.
  - Atualiza a tabela `clientes` e revalida as telas afetadas.
- A action de admin `atualizarCliente` permanece intocada (uso exclusivo da tela de Customers).

### Banco (RLS)

- Nova migração evoluindo a política `clientes_update_visita_comercial` / função `cliente_em_visita_comercial_editavel` (`20250625130000_cliente_nome_visita_rls.sql`):
  - Incluir o estado `no_visit` (agendamento) além de `visit_scheduled` / `visit_in_progress`.
  - A política continua limitada ao escopo comercial da OS vinculada; a trava "só na primeira visita" fica garantida no banco, não apenas na tela.
- Políticas de admin existentes não mudam.

### Link "Clients" no menu do admin do dashboard

- O menu do admin no Ops Center (`CENTRO_ADMIN_MENU_ITEMS` em `src/components/admin/centro-operacional/centro-admin-menu.tsx`) não possui atalho para a lista de clientes.
- Adicionar item `{ href: "/admin/clientes", label: "Clients", icon: "users" }` junto de Users, Teams, Contractors, Units, Inventory e Financial.

### Fluxo de dados

1. Usuário abre `/os/[id]` (fila "Awaiting First Visit" ou visita em execução).
2. Clica em "Edit customer" → modal com `ClienteForm` em modo primeira visita, pré-preenchido.
3. Salvar → `atualizarClientePrimeiraVisita` → validação de estado da OS → update em `clientes` → revalidação → modal fecha e cartão do cliente reflete os novos dados.
4. Concluída a primeira visita (OS avança de status/etapa), o botão deixa de aparecer e a RLS deixa de permitir o update para o time de campo.

### Tratamento de erros

- OS fora do estado permitido: mensagem clara ("Editing is only available until the first visit is completed") — cobre corrida entre abrir o modal e concluir a visita.
- Validações de campo iguais às do cadastro (nome obrigatório, etc.), reaproveitadas do `ClienteForm`.
- Falha de RLS/rede: exibir o erro retornado pela action no próprio modal, sem fechar.

### Testes

- O repositório não possui testes automatizados; a verificação será manual:
  - Editar cliente no estado `NO VISIT` (agendamento) — deve salvar.
  - Editar durante `VISIT SCHEDULED` / `VISIT IN PROGRESS` — deve salvar.
  - Após concluir a primeira visita — botão ausente e update bloqueado pelo banco.
  - Admin segue editando pela tela de Customers em qualquer estado.
  - Campos equipe/contractor/ativo não aparecem nem são aceitos pela action na primeira visita.
  - Menu do admin no dashboard exibe "Clients" e navega para `/admin/clientes`.

## Fora do escopo

- Corrigir o botão "Schedule visit" de Admin → Customers que cria OS duplicada (`criarOrdemServicoComVisita` ignora a OS `no_visit` existente) — problema conhecido, tratar em tarefa separada.
- Sistema genérico de permissões por campo/etapa.
