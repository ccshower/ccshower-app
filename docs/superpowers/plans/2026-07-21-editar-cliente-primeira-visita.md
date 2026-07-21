# Edição Completa do Cliente na Primeira Visita — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o time de campo edite todos os dados cadastrais do cliente (nome, telefone, email, tipo, endereço, origem do lead, observações) enquanto a OS está na primeira visita comercial (`no_visit`, `visit_scheduled`, `visit_in_progress`), com trava garantida por RLS; e adicionar o link "Clients" ao menu do admin no dashboard.

**Architecture:** Extrai o `ClienteForm` existente (hoje dentro de `clientes-client.tsx`) para um componente compartilhado com modo `primeira_visita` (oculta equipe/contractor/ativo). Nova server action `atualizarClientePrimeiraVisita` valida o estado da OS no servidor e atualiza só campos cadastrais. Migração SQL amplia a política RLS `clientes_update_visita_comercial` para incluir `no_visit`. Botão "Edit customer" entra no cartão-resumo do workspace `/os/[id]` (`OsWorkspaceResumo`), visível nos dois momentos da primeira visita, e o campo avulso de nome (`OsClienteNomeVisitaField`) é removido.

**Tech Stack:** Next.js App Router (server actions), Supabase (Postgres + RLS), React client components, Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-21-editar-cliente-primeira-visita-design.md`

## Global Constraints

- Repositório NÃO possui testes automatizados nem framework de teste. Verificação por task = `npm run lint` + `npm run build` + checagem manual descrita na task. NÃO adicionar framework de teste.
- Idioma do código/UI: inglês nos textos de UI (padrão do app, ex.: "Edit customer"); comentários em português são aceitos (padrão existente).
- Campos FORA do escopo de edição na primeira visita: `equipe_id`, `contractor_id`, `ativo`, `unidade_id`, `empresa_id`. A action nunca deve escrevê-los.
- Mudança de `tipo_cliente` DE ou PARA `contractor` não é permitida na primeira visita (contractor está fora do escopo). Cliente contractor mantém o tipo travado.
- A action de admin `atualizarCliente` (`src/app/admin/clientes/actions.ts`) permanece intocada.
- Commits frequentes: um commit ao fim de cada task, com apenas os arquivos da task. Nunca `git add .` (há arquivos untracked alheios no repo).
- Windows/PowerShell: usar `;` para encadear comandos no terminal, não `&&`.

---

### Task 1: Migração RLS — incluir `no_visit` na janela de edição

**Files:**
- Create: `supabase/migrations/20260721120000_cliente_primeira_visita_rls.sql`

**Interfaces:**
- Consumes: função existente `public.cliente_em_visita_comercial_editavel(uuid)` criada em `supabase/migrations/20250625130000_cliente_nome_visita_rls.sql`.
- Produces: mesma função, agora retornando `true` também quando `status_atual = 'no_visit'`. A política `clientes_update_visita_comercial` já usa essa função e não precisa ser recriada (mas a migração a recria por idempotência, igual ao padrão da migração original).

- [ ] **Step 1: Criar o arquivo de migração**

```sql
-- Amplia a janela de edição do cliente pela equipe comercial para cobrir
-- toda a primeira visita: agendamento (no_visit) + execução
-- (visit_scheduled / visit_in_progress). Antes cobria apenas a execução.

create or replace function public.cliente_em_visita_comercial_editavel(c_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ordens_servico os
    join public.equipes e
      on e.id = coalesce(os.equipe_atual_id, os.equipe_id)
    where os.cliente_id = c_id
      and coalesce(os.ativo, true)
      and os.etapa_atual = 'commercial'
      and os.status_atual in ('no_visit', 'visit_scheduled', 'visit_in_progress')
      and public.equipe_is_commercial_stage(e)
      and (
        public.can_view_all_equipes()
        or public.can_manage_sistema()
        or os.responsavel_id = auth.uid()
        or os.criado_por = auth.uid()
        or e.id = public.current_equipe_id()
        or (
          public.user_equipe_is_commercial_stage()
          and (
            e.unidade_id is null
            or public.current_unidade_id() is null
            or e.unidade_id = public.current_unidade_id()
          )
        )
      )
  );
$$;

grant execute on function public.cliente_em_visita_comercial_editavel(uuid) to authenticated;

drop policy if exists clientes_update_visita_comercial on public.clientes;
create policy clientes_update_visita_comercial
on public.clientes
for update
to authenticated
using (public.cliente_em_visita_comercial_editavel(id))
with check (public.cliente_em_visita_comercial_editavel(id));
```

(Única diferença em relação à migração `20250625130000`: a linha `status_atual in (...)` ganha `'no_visit'`.)

- [ ] **Step 2: Aplicar a migração no projeto Supabase**

Aplicar via MCP do Supabase (`apply_migration`, name: `cliente_primeira_visita_rls`, conteúdo acima) no projeto usado pelo app. Se o MCP não estiver disponível, informar ao usuário para rodar o SQL no Supabase Studio.

Expected: migração aplicada sem erro; `select public.cliente_em_visita_comercial_editavel('00000000-0000-0000-0000-000000000000');` retorna `false` (função existe e executa).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260721120000_cliente_primeira_visita_rls.sql
git commit -m "feat: RLS permite editar cliente tambem no agendamento da primeira visita"
```

---

### Task 2: Extrair `ClienteForm` para componente compartilhado com modo `primeira_visita`

**Files:**
- Create: `src/components/clientes/cliente-form.tsx`
- Modify: `src/app/admin/clientes/clientes-client.tsx` (remover a definição local, linhas 81–360; importar do novo caminho)
- Modify: `src/components/admin/centro-operacional/centro-operacional-client.tsx:23` (atualizar import)

**Interfaces:**
- Consumes: componentes já existentes `GooglePlacesField`/`googleAddressFromCliente` (`@/components/maps/google-places-field`), `ClienteContractorSelect`/`validateClienteContractorForm`, `ClienteLeadSourceFields`/`validateClienteLeadSourceForm`, `Field`, `CLIENT_TYPE`/`parseClientType`, `filterEquipesForStage`/`pickDefaultCommercialEquipeId`, `t`/`tClientType`.
- Produces: `export function ClienteForm(props: ClienteFormProps)` em `src/components/clientes/cliente-form.tsx`, onde `ClienteFormProps` é a assinatura atual MAIS:
  - `mode?: "admin" | "primeira_visita"` (default `"admin"`)
  - `equipes`, `usuarios`, `canChooseEquipe`, `defaultEquipeId` tornam-se opcionais (default `[]`, `[]`, `false`, `null`) — em modo `primeira_visita` não são usados.

- [ ] **Step 1: Criar `src/components/clientes/cliente-form.tsx`**

Mover o bloco `export function ClienteForm({...})` de `src/app/admin/clientes/clientes-client.tsx` (linhas 81–360) para o novo arquivo, mantendo o corpo idêntico, com estas alterações exatas:

1. Cabeçalho do arquivo (imports próprios — copiar apenas os usados pelo form):

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ClienteContractorSelect,
  validateClienteContractorForm,
} from "@/components/clientes/cliente-contractor-select";
import {
  ClienteLeadSourceFields,
  validateClienteLeadSourceForm,
} from "@/components/clientes/cliente-lead-source-fields";
import { Field } from "@/components/ui/field";
import {
  CLIENT_TYPE,
  parseClientType,
  type ClientType,
} from "@/lib/clientes/tipo-cliente";
import { t, tClientType } from "@/lib/i18n";
import {
  filterEquipesForStage,
  pickDefaultCommercialEquipeId,
} from "@/lib/ordens-servico/workflow-equipe";
import type {
  ClienteWithRelations,
  Contractor,
  Equipe,
  Usuario,
} from "@/lib/types/database";

import {
  GooglePlacesField,
  googleAddressFromCliente,
  type GoogleAddress,
} from "@/components/maps/google-places-field";
```

2. Assinatura com o novo prop e opcionais:

```tsx
export type ClienteFormMode = "admin" | "primeira_visita";

export function ClienteForm({
  cliente,
  equipes = [],
  usuarios = [],
  contractors,
  apiKey,
  formKey,
  pending,
  canChooseEquipe = false,
  defaultEquipeId = null,
  mode = "admin",
  onCancel,
  onSubmit,
}: {
  cliente?: ClienteWithRelations | null;
  equipes?: Equipe[];
  usuarios?: Usuario[];
  contractors: Contractor[];
  apiKey: string;
  formKey: string;
  pending: boolean;
  canChooseEquipe?: boolean;
  defaultEquipeId?: string | null;
  mode?: ClienteFormMode;
  onCancel: () => void;
  onSubmit: (fd: FormData) => void;
}) {
```

3. Logo após os `useState`/`useMemo` existentes, adicionar:

```tsx
  const primeiraVisita = mode === "primeira_visita";
  const tipoTravado = primeiraVisita && parseClientType(cliente?.tipo_cliente ?? "residential") === "contractor";
  const tipoOptions = primeiraVisita
    ? CLIENT_TYPE.filter((tipo) => tipo !== "contractor")
    : CLIENT_TYPE;
```

4. No `onSubmit` do `<form>`, pular validação de equipe em modo primeira visita. Substituir o bloco que começa em `const equipeId = canChooseEquipe` e termina em `fd.set("equipe_id", equipeId);` (linhas 152–168 do arquivo original) por:

```tsx
        if (!primeiraVisita) {
          const equipeId = canChooseEquipe
            ? String(fd.get("equipe_id") ?? "").trim()
            : String(effectiveEquipeId ?? "").trim();
          if (!equipeId) {
            setEquipeError(
              commercialEquipes.length === 0
                ? t("equipe.noCommercialTeam")
                : canChooseEquipe
                  ? t("equipe.required")
                  : t("equipe.userWithoutTeam"),
            );
            return;
          }
          setEquipeError(null);
          if (!canChooseEquipe) {
            fd.set("equipe_id", equipeId);
          }
        }
```

5. Também no `onSubmit`, pular a validação de contractor quando primeira visita (o tipo contractor não é selecionável): envolver o bloco `const contractorErr = ...` até `setContractorError(null);` em `if (!primeiraVisita) { ... }`.

6. No JSX, o `<select name="tipo_cliente">`: trocar `{CLIENT_TYPE.map(...)}` por `{tipoOptions.map(...)}`, e quando `tipoTravado` renderizar no lugar do select:

```tsx
      <Field label="Customer type">
        {tipoTravado ? (
          <p className="rounded-sm border border-cc-border bg-cc-border-light/40 px-3 py-2.5 text-sm text-cc-ink">
            {tClientType("contractor")}
          </p>
        ) : (
          <select
            name="tipo_cliente"
            required
            value={tipoCliente}
            onChange={(e) => {
              const next = parseClientType(e.target.value);
              setTipoCliente(next);
              if (next !== "contractor") setContractorId("");
              setContractorError(null);
            }}
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none focus:border-cc-blue-focus focus:shadow-focus"
          >
            {tipoOptions.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tClientType(tipo)}
              </option>
            ))}
          </select>
        )}
      </Field>
```

7. O bloco do contractor (`{tipoCliente === "contractor" ? <ClienteContractorSelect .../> : <input type="hidden" .../>}`): envolver para não renderizar nada em primeira visita:

```tsx
      {!primeiraVisita ? (
        tipoCliente === "contractor" ? (
          <ClienteContractorSelect
            contractors={contractors}
            value={contractorId}
            disabled={pending}
            onChange={setContractorId}
          />
        ) : (
          <input type="hidden" name="contractor_id" value="" />
        )
      ) : null}
```

8. O `<Field label={t("equipe.operational")} ...>` inteiro (equipe): envolver em `{!primeiraVisita ? ( ... ) : null}`.

Nenhuma outra mudança — nome, telefone, email, tipo, lead source, GooglePlacesField, cidade/estado/cep, observações e botões ficam idênticos.

- [ ] **Step 2: Atualizar `src/app/admin/clientes/clientes-client.tsx`**

1. Apagar a definição local de `ClienteForm` (linhas 81–360).
2. Remover do topo os imports que ficaram sem uso após a remoção (verificar com lint): `ClienteContractorSelect`, `validateClienteContractorForm`, `ClienteLeadSourceFields`, `validateClienteLeadSourceForm`, `Field`, `CLIENT_TYPE`, `parseClientType`, `ClientType`, `filterEquipesForStage`, `pickDefaultCommercialEquipeId`, `GooglePlacesField`, `googleAddressFromCliente`, `GoogleAddress`, `tClientType` (manter os que `ClientesClient` ainda usa — o lint aponta).
3. Adicionar import e re-export (o re-export preserva o import público existente usado por outros arquivos):

```tsx
import { ClienteForm } from "@/components/clientes/cliente-form";

export { ClienteForm };
```

- [ ] **Step 3: Atualizar import em `centro-operacional-client.tsx`**

Linha 23: trocar

```tsx
import { ClienteForm } from "@/app/admin/clientes/clientes-client";
```

por

```tsx
import { ClienteForm } from "@/components/clientes/cliente-form";
```

- [ ] **Step 4: Verificar**

Run: `npm run lint; npm run build`
Expected: sem erros. Manual: tela `/admin/clientes` → lápis → modal Edit customer funciona como antes (todos os campos, incluindo equipe e contractor).

- [ ] **Step 5: Commit**

```bash
git add src/components/clientes/cliente-form.tsx src/app/admin/clientes/clientes-client.tsx src/components/admin/centro-operacional/centro-operacional-client.tsx
git commit -m "refactor: extrai ClienteForm para componente compartilhado com modo primeira_visita"
```

---

### Task 3: Predicado + server action `atualizarClientePrimeiraVisita`

**Files:**
- Modify: `src/lib/ordens-servico/visita-comercial.ts` (novo predicado)
- Modify: `src/app/ordens-servico/visita-comercial-actions.ts` (nova action)

**Interfaces:**
- Consumes: `loadOsParaVisita`, `requireAuth`, `revalidateOs`, `buildInitialCommercialOsTitulo` (já existem em `visita-comercial-actions.ts`); `parseLeadSourceFromForm`/`mapDbErrorLeadSource` de `@/lib/clientes/lead-source`; `parseClientType` de `@/lib/clientes/tipo-cliente`.
- Produces:
  - `isClienteEditavelPrimeiraVisita(os)` em `visita-comercial.ts` — usado pela action e pela UI (Task 4).
  - `atualizarClientePrimeiraVisita(osId: string, formData: FormData): Promise<ActionResult>` — usada pelo modal (Task 4).

- [ ] **Step 1: Adicionar predicado em `src/lib/ordens-servico/visita-comercial.ts`**

Após `isVisitaComercialExecucao` (linha 33), adicionar:

```ts
/** Cliente editável pelo time de campo: toda a primeira visita comercial. */
export function isClienteEditavelPrimeiraVisita(
  os: Pick<
    OrdemServicoWithRelations,
    "etapa_atual" | "status" | "status_atual" | "visita_inicial"
  >,
): boolean {
  return isOsAgendamentoVisita(os) || isVisitaComercialExecucao(os);
}
```

- [ ] **Step 2: Adicionar a action em `src/app/ordens-servico/visita-comercial-actions.ts`**

Novos imports no topo (juntar aos existentes):

```ts
import { isClienteEditavelPrimeiraVisita } from "@/lib/ordens-servico/visita-comercial";
import {
  mapDbErrorLeadSource,
  parseLeadSourceFromForm,
} from "@/lib/clientes/lead-source";
import { parseClientType } from "@/lib/clientes/tipo-cliente";
```

Adicionar após `salvarNomeClienteVisitaComercial` (linha ~344):

```ts
function emptyToNull(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function readNumber(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Atualiza dados cadastrais do cliente durante a primeira visita (agendamento ou execução). */
export async function atualizarClientePrimeiraVisita(
  osId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (!isClienteEditavelPrimeiraVisita(os)) {
      return {
        ok: false,
        message: "Editing is only available until the first visit is completed",
      };
    }

    const nome = String(formData.get("nome") ?? "").trim();
    const telefone = String(formData.get("telefone") ?? "").trim();
    const endereco_formatado = String(formData.get("endereco_formatado") ?? "").trim();
    if (!nome || !telefone || !endereco_formatado) {
      return { ok: false, message: "Name, phone and address are required" };
    }

    const lead = parseLeadSourceFromForm(formData, { required: false });
    if (!lead.ok) return lead;

    // Contractor está fora do escopo da primeira visita: tipo não muda de/para contractor.
    const { data: atual, error: cliLoadErr } = await supabase
      .from("clientes")
      .select("tipo_cliente")
      .eq("id", os.cliente_id)
      .single();
    if (cliLoadErr) return { ok: false, message: cliLoadErr.message };

    const tipoAtual = parseClientType(String(atual?.tipo_cliente ?? "residential"));
    let tipo_cliente = tipoAtual;
    if (tipoAtual !== "contractor") {
      const requested = parseClientType(String(formData.get("tipo_cliente") ?? ""));
      if (requested !== "contractor") tipo_cliente = requested;
    }

    const { error: cliErr } = await supabase
      .from("clientes")
      .update({
        nome,
        telefone,
        tipo_cliente,
        email: emptyToNull(formData.get("email")),
        endereco_formatado,
        endereco_linha1: emptyToNull(formData.get("endereco_linha1")),
        cidade: emptyToNull(formData.get("cidade")),
        estado: emptyToNull(formData.get("estado")),
        cep: emptyToNull(formData.get("cep")),
        pais: emptyToNull(formData.get("pais")) ?? "US",
        google_place_id: emptyToNull(formData.get("google_place_id")),
        latitude: readNumber(formData.get("latitude")),
        longitude: readNumber(formData.get("longitude")),
        google_maps_url: emptyToNull(formData.get("google_maps_url")),
        observacoes: emptyToNull(formData.get("observacoes")),
        origem_lead: lead.origem_lead,
        origem_lead_outro: lead.origem_lead_outro,
      })
      .eq("id", os.cliente_id);

    if (cliErr) {
      return {
        ok: false,
        message: cliErr.message.includes("policy")
          ? "Not allowed to edit this customer for this visit"
          : mapDbErrorLeadSource(cliErr.message),
      };
    }

    // Mantém título da OS e do evento de agenda em sincronia com o nome.
    const titulo = buildInitialCommercialOsTitulo(nome);
    const { error: osErr } = await supabase
      .from("ordens_servico")
      .update({ titulo })
      .eq("id", osId);
    if (osErr) return { ok: false, message: osErr.message };

    if (os.visita_inicial?.id) {
      await supabase
        .from("agenda_eventos")
        .update({ titulo })
        .eq("id", os.visita_inicial.id);
    }

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error updating customer",
    };
  }
}
```

Nota: NÃO escrever `equipe_id`, `contractor_id`, `ativo`, `unidade_id`, `empresa_id` (Global Constraints).

- [ ] **Step 3: Verificar**

Run: `npm run lint; npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ordens-servico/visita-comercial.ts src/app/ordens-servico/visita-comercial-actions.ts
git commit -m "feat: action de edicao completa do cliente na primeira visita"
```

---

### Task 4: Botão + modal "Edit customer" no workspace e remoção do campo avulso de nome

**Files:**
- Create: `src/components/ordens-servico/os-cliente-editar-primeira-visita.tsx`
- Modify: `src/components/ordens-servico/workspace/os-workspace-resumo.tsx` (botão no cartão-resumo)
- Modify: `src/components/ordens-servico/workspace/os-workspace-page.tsx` (prop `googleMapsApiKey`)
- Modify: `src/app/os/[id]/page.tsx` (passar a API key)
- Modify: `src/components/ordens-servico/workspace/os-workspace-commercial.tsx` (remover campo de nome)
- Delete: `src/components/ordens-servico/os-cliente-nome-visita-field.tsx`

**Interfaces:**
- Consumes: `ClienteForm` com `mode="primeira_visita"` (Task 2), `atualizarClientePrimeiraVisita` e `isClienteEditavelPrimeiraVisita` (Task 3), `OperationalModal` (`@/components/operacional/operational-modal`).
- Produces: `OsClienteEditarPrimeiraVisita({ ordem, googleMapsApiKey, onSaved })` — componente autocontido (botão + modal). O botão só renderiza quando `isClienteEditavelPrimeiraVisita(ordem)` e `ordem.cliente` existe.

- [ ] **Step 1: Criar `src/components/ordens-servico/os-cliente-editar-primeira-visita.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";

import { atualizarClientePrimeiraVisita } from "@/app/ordens-servico/visita-comercial-actions";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { OperationalModal } from "@/components/operacional/operational-modal";
import { isClienteEditavelPrimeiraVisita } from "@/lib/ordens-servico/visita-comercial";
import type { OrdemServicoWithRelations } from "@/lib/types/database";

type Props = {
  ordem: OrdemServicoWithRelations;
  googleMapsApiKey: string;
  onSaved: () => void;
};

/** Botão + modal de edição completa do cliente — visível só na primeira visita comercial. */
export function OsClienteEditarPrimeiraVisita({
  ordem,
  googleMapsApiKey,
  onSaved,
}: Props) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cliente = ordem.cliente;
  if (!cliente || !isClienteEditavelPrimeiraVisita(ordem)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
        className="rounded-sm border border-cc-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-cc-deep hover:bg-cc-border-light"
      >
        Edit customer
      </button>

      <OperationalModal
        open={open}
        title="Edit customer"
        onClose={() => setOpen(false)}
      >
        <ClienteForm
          key={`${cliente.id}-${open}`}
          formKey={`${cliente.id}-${open}`}
          cliente={cliente}
          contractors={[]}
          apiKey={googleMapsApiKey}
          pending={pending}
          mode="primeira_visita"
          onCancel={() => setOpen(false)}
          onSubmit={(fd) => {
            startTransition(async () => {
              setMsg(null);
              const r = await atualizarClientePrimeiraVisita(ordem.id, fd);
              if (!r.ok) {
                setMsg(r.message);
                return;
              }
              setOpen(false);
              onSaved();
            });
          }}
        />
        {msg ? (
          <p className="mt-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm text-cc-red">
            {msg}
          </p>
        ) : null}
      </OperationalModal>
    </>
  );
}
```

Nota: verificar o tipo de `ordem.cliente` vs o prop `cliente` do `ClienteForm` (`ClienteWithRelations`). Se `OrdemServicoWithRelations["cliente"]` for um subtipo (ex.: `Cliente | null`), ajustar o prop do `ClienteForm` para aceitar `Cliente` — o form só lê campos base do cliente, não a relação `equipe`. Ajuste aceitável: trocar o tipo do prop `cliente` em `cliente-form.tsx` para `Cliente | ClienteWithRelations | null`.

- [ ] **Step 2: Botão no cartão-resumo (`os-workspace-resumo.tsx`)**

1. Props: adicionar `googleMapsApiKey?: string`:

```tsx
type Props = {
  ordem: OrdemServicoWithRelations;
  isAdmin?: boolean;
  googleMapsApiKey?: string;
  onAtualizado?: () => void;
};
```

2. Import:

```tsx
import { OsClienteEditarPrimeiraVisita } from "@/components/ordens-servico/os-cliente-editar-primeira-visita";
```

3. No `<div className="flex shrink-0 flex-wrap gap-2">` (linha 73), antes do botão de desconto, inserir:

```tsx
            <OsClienteEditarPrimeiraVisita
              ordem={ordem}
              googleMapsApiKey={googleMapsApiKey ?? ""}
              onSaved={() => onAtualizado?.()}
            />
```

(O próprio componente decide não renderizar fora da primeira visita.)

- [ ] **Step 3: Plumbing da API key**

1. `os-workspace-page.tsx`: adicionar `googleMapsApiKey?: string` ao `Props`, receber no componente e repassar:

```tsx
      <OsWorkspaceResumo
        ordem={ordem}
        isAdmin={isAdmin}
        googleMapsApiKey={googleMapsApiKey}
        onAtualizado={recarregar}
      />
```

2. `src/app/os/[id]/page.tsx`: no `<OsWorkspacePage ...>`, adicionar:

```tsx
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
```

- [ ] **Step 4: Remover o campo avulso de nome da execução da visita**

Em `os-workspace-commercial.tsx`:

1. Remover o import de `OsClienteNomeVisitaField`/`persistirNomeClienteAntesFinalizarVisita` (linhas 10–13).
2. Remover o estado `clienteNome` (linha 50) e a linha `setClienteNome(...)` do `useEffect` (linha 58); remover `ordem.cliente?.nome` das deps do efeito.
3. Em `finalizar()`, remover o bloco `const nomeOk = await persistirNomeClienteAntesFinalizarVisita(...)` até o `if (!nomeOk.ok) {...}` (linhas 88–96).
4. Remover o JSX `<OsClienteNomeVisitaField ... />` (linhas 135–143).

Depois, apagar o arquivo `src/components/ordens-servico/os-cliente-nome-visita-field.tsx` e remover a action `salvarNomeClienteVisitaComercial` de `visita-comercial-actions.ts` (fica sem uso; confirmar com busca por `salvarNomeClienteVisitaComercial` antes de apagar — deve restar 0 referências fora do próprio arquivo).

- [ ] **Step 5: Verificar**

Run: `npm run lint; npm run build`
Expected: sem erros.

Manual (usuário comercial não-admin):
- OS em NO VISIT (`/os/[id]`): botão "Edit customer" aparece no cartão do topo; editar nome/email/endereço salva e o cartão atualiza.
- OS com visita agendada/em andamento: botão aparece e salva; campo avulso de nome não existe mais.
- OS em etapa posterior (ex.: financial_review): botão não aparece.
- Admin em `/admin/clientes`: modal completo continua com equipe/contractor.

- [ ] **Step 6: Commit**

```bash
git add src/components/ordens-servico/os-cliente-editar-primeira-visita.tsx src/components/ordens-servico/workspace/os-workspace-resumo.tsx src/components/ordens-servico/workspace/os-workspace-page.tsx "src/app/os/[id]/page.tsx" src/components/ordens-servico/workspace/os-workspace-commercial.tsx src/app/ordens-servico/visita-comercial-actions.ts
git rm src/components/ordens-servico/os-cliente-nome-visita-field.tsx
git commit -m "feat: edicao completa do cliente no workspace durante a primeira visita"
```

---

### Task 5: Link "Clients" no menu do admin do dashboard

**Files:**
- Modify: `src/components/admin/centro-operacional/centro-admin-menu.tsx:19-26`

**Interfaces:**
- Consumes: `CENTRO_ADMIN_MENU_ITEMS` existente; rota `/admin/clientes` já existente.
- Produces: item de menu novo, sem mudanças de tipo.

- [ ] **Step 1: Adicionar o item**

Em `CENTRO_ADMIN_MENU_ITEMS`, adicionar como PRIMEIRO item:

```ts
  { href: "/admin/clientes", label: "Clients", icon: "users" },
```

- [ ] **Step 2: Verificar**

Run: `npm run lint`
Expected: sem erros. Manual: dashboard → menu do admin (canto superior direito) mostra "Clients" e navega para `/admin/clientes`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/centro-operacional/centro-admin-menu.tsx
git commit -m "feat: link Clients no menu admin do dashboard"
```

---

### Task 6: Verificação final de ponta a ponta

**Files:** nenhum (verificação).

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: sucesso.

- [ ] **Step 2: Checklist manual (com o usuário ou via dev server)**

1. Criar cliente de teste por telefone (nome propositalmente errado).
2. `/os/[id]` em NO VISIT → Edit customer → corrigir nome + email → salvar → cartão e fila refletem.
3. Agendar a visita → Edit customer ainda disponível → salvar outra correção.
4. Finalizar a visita → botão some; tentar update direto (se possível via SQL com usuário de campo) é bloqueado pela RLS.
5. Admin → dashboard → menu admin → Clients → lápis → edição completa segue funcionando (inclusive equipe).
6. Cliente tipo contractor: na primeira visita o tipo aparece travado e o contractor não é alterado.

- [ ] **Step 3: Encerrar**

Reportar resultado ao usuário; não fazer push sem solicitação.
