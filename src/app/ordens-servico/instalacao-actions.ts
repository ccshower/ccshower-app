"use server";

import { revalidatePath } from "next/cache";

import { concluirRepairEpisode, validarRepairProntoParaFinalizar } from "@/app/ordens-servico/repair-actions";
import { transicionarEtapaOrdemServico } from "@/app/ordens-servico/actions";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import { spreadAgendaEventoDatetime } from "@/lib/ordens-servico/agenda-evento-query";
import {
  type AmbienteInstalacaoCapture,
  parseOsAmbienteInstalacaoStatus,
  validarCapturaBloqueioAmbiente,
  validarFinalizacaoInstalacaoAmbientes,
} from "@/lib/ordens-servico/os-ambiente-instalacao";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import {
  buildInstallationFinancialStatus,
  installationPaymentFromOrdem,
  isSeparationItemChecked,
  parseInstallationPaymentAmount,
  type InstallationPaymentCapture,
} from "@/lib/ordens-servico/installation-workspace";
import {
  retornarOsInstalacaoAoProjeto,
} from "@/lib/ordens-servico/retorno-projeto-instalacao";
import {
  OS_ANEXO_TIPO_INSTALLATION,
  OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT,
  OS_ANEXOS_BUCKET,
} from "@/lib/ordens-servico/visita-comercial";
import { parseVisitPaymentMethod } from "@/lib/ordens-servico/visit-payment";
import { createClient } from "@/lib/supabase/server";
import type { OsAmbiente, OsAnexo, OsAnexoComUrl, OsSeparationListItem } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionResult =
  | { ok: true; id?: string; modo?: "completa" | "parcial_projeto" }
  | { ok: false; message: string };

type SeparationListRow = OsSeparationListItem & {
  catalogo_itens: OsSeparationListItem["catalogo_item"];
};

function mapSeparationListRow(row: SeparationListRow): OsSeparationListItem {
  const { catalogo_itens, ...rest } = row;
  return { ...rest, catalogo_item: catalogo_itens ?? null };
}

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/admin/centro-operacional");
  revalidatePath("/operacao");
  revalidatePath("/financeiro");
  revalidatePath("/calendar");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

type LoadOsInstalacaoResult =
  | { error: string }
  | {
      os: {
        id: string;
        cliente_id: string;
        equipe_id: string;
        responsavel_id: string | null;
        valor_previsto: number | null;
        visit_payment_received: boolean;
        visit_payment_amount: number | null;
        visit_payment_method: string | null;
        installation_payment_received: boolean;
        installation_payment_amount: number | null;
        installation_payment_method: string | null;
        installation_payment_notes: string | null;
        installation_balance_pending_acknowledged: boolean;
        installation_execution_notes: string | null;
        repair_ativo: boolean;
        desconto_valor?: number | null;
      };
    };

async function loadOsInstalacao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<LoadOsInstalacaoResult> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, etapa_atual, equipe_atual_id, equipe_id, responsavel_id, valor_previsto, visit_payment_received, visit_payment_amount, visit_payment_method, installation_payment_received, installation_payment_amount, installation_payment_method, installation_payment_notes, installation_balance_pending_acknowledged, installation_execution_notes, repair_ativo, desconto_valor",
    )
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Work order not found" };
  }

  if (parseOsStage(data.etapa_atual as string) !== "installation") {
    return { error: "Work order is not in the Installation stage" };
  }

  const equipe_id =
    (data.equipe_atual_id as string | null) ??
    (data.equipe_id as string | null);

  if (!equipe_id) {
    return { error: "Work order has no team for installation operation" };
  }

  return {
    os: {
      id: data.id as string,
      cliente_id: data.cliente_id as string,
      equipe_id,
      responsavel_id: data.responsavel_id as string | null,
      valor_previsto: data.valor_previsto as number | null,
      visit_payment_received: data.visit_payment_received as boolean,
      visit_payment_amount: data.visit_payment_amount as number | null,
      visit_payment_method: data.visit_payment_method as string | null,
      installation_payment_received: data.installation_payment_received as boolean,
      installation_payment_amount: data.installation_payment_amount as number | null,
      installation_payment_method: data.installation_payment_method as string | null,
      installation_payment_notes: data.installation_payment_notes as string | null,
      installation_balance_pending_acknowledged:
        data.installation_balance_pending_acknowledged as boolean,
      installation_execution_notes: data.installation_execution_notes as string | null,
      repair_ativo: Boolean(data.repair_ativo),
      desconto_valor: data.desconto_valor as number | null,
    },
  };
}

function buildInstallationPaymentUpdate(
  capture: InstallationPaymentCapture,
):
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; message: string } {
  if (!capture.received) {
    return {
      ok: true,
      row: {
        installation_payment_received: false,
        installation_payment_amount: null,
        installation_payment_method: null,
        installation_payment_notes: null,
        installation_balance_pending_acknowledged: false,
      },
    };
  }

  const amountParsed = parseInstallationPaymentAmount(capture.amount);
  if (!amountParsed.ok) return amountParsed;

  const method = parseVisitPaymentMethod(capture.method);
  if (!method) {
    return { ok: false, message: "Select a payment method" };
  }

  return {
    ok: true,
    row: {
      installation_payment_received: true,
      installation_payment_amount: amountParsed.value,
      installation_payment_method: method,
      installation_payment_notes: capture.notes.trim() || null,
      installation_balance_pending_acknowledged: false,
    },
  };
}

async function signedAnexos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: OsAnexo[],
): Promise<OsAnexoComUrl[]> {
  const out: OsAnexoComUrl[] = [];
  for (const row of rows) {
    const { data: signed } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .createSignedUrl(row.storage_path, 3600);
    out.push({ ...row, url: signed?.signedUrl ?? "" });
  }
  return out;
}

export async function listarFotosInstalacao(
  osId: string,
): Promise<{ fotos: OsAnexoComUrl[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_anexos")
      .select("*")
      .eq("ordem_servico_id", osId)
      .eq("tipo", OS_ANEXO_TIPO_INSTALLATION)
      .order("criado_em", { ascending: false });

    if (error) return { fotos: [], error: error.message };
    return { fotos: await signedAnexos(supabase, (data ?? []) as OsAnexo[]) };
  } catch (e) {
    return {
      fotos: [],
      error: e instanceof Error ? e.message : "Error listing photos",
    };
  }
}

export async function listarComprovantePagamentoInstalacao(
  osId: string,
): Promise<{ comprovante: OsAnexoComUrl | null; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_anexos")
      .select("*")
      .eq("ordem_servico_id", osId)
      .eq("tipo", OS_ANEXO_TIPO_INSTALLATION_PAYMENT_RECEIPT)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { comprovante: null, error: error.message };
    if (!data) return { comprovante: null };

    const [signed] = await signedAnexos(supabase, [data as OsAnexo]);
    return { comprovante: signed ?? null };
  } catch (e) {
    return {
      comprovante: null,
      error: e instanceof Error ? e.message : "Error listing receipt",
    };
  }
}

export async function removerFotoInstalacao(
  anexoId: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { data: row, error: loadErr } = await supabase
      .from("os_anexos")
      .select("id, storage_path, ordem_servico_id, tipo")
      .eq("id", anexoId)
      .single();

    if (loadErr || !row) {
      return { ok: false, message: loadErr?.message ?? "Attachment not found" };
    }
    if (row.tipo !== OS_ANEXO_TIPO_INSTALLATION) {
      return { ok: false, message: "Invalid attachment" };
    }

    const loaded = await loadOsInstalacao(supabase, row.ordem_servico_id as string);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    await supabase.storage.from(OS_ANEXOS_BUCKET).remove([row.storage_path as string]);
    const { error } = await supabase.from("os_anexos").delete().eq("id", anexoId);
    if (error) return { ok: false, message: error.message };

    revalidateOs(row.ordem_servico_id as string);
    return { ok: true, id: row.ordem_servico_id as string };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error removing photo",
    };
  }
}

export type ChecklistConferenciaInput = {
  item_id: string;
  checked: boolean;
};

export async function confirmarConferenciaSeparacao(
  osId: string,
  items: ChecklistConferenciaInput[],
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { data: rows, error: listErr } = await supabase
      .from("os_separation_list_items")
      .select("id, quantity")
      .eq("ordem_servico_id", osId);

    if (listErr) return { ok: false, message: listErr.message };

    const rowMap = new Map(
      (rows ?? []).map((row) => [row.id as string, Number(row.quantity)]),
    );

    if (rowMap.size !== items.length) {
      return {
        ok: false,
        message: "Separation list is out of date. Reload the page.",
      };
    }

    for (const item of items) {
      if (!rowMap.has(item.item_id)) {
        return { ok: false, message: "Invalid item in checklist review" };
      }
    }

    for (const item of items) {
      const qty = rowMap.get(item.item_id)!;
      const { error } = await supabase
        .from("os_separation_list_items")
        .update({ qty_checked: item.checked ? qty : 0 })
        .eq("id", item.item_id)
        .eq("ordem_servico_id", osId);

      if (error) return { ok: false, message: error.message };
    }

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error confirming checklist review",
    };
  }
}

export async function salvarPagamentoInstalacao(
  osId: string,
  capture: InstallationPaymentCapture,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const built = buildInstallationPaymentUpdate(capture);
    if (!built.ok) return built;

    const { error } = await supabase
      .from("ordens_servico")
      .update(built.row)
      .eq("id", osId);

    if (error) return { ok: false, message: error.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving payment",
    };
  }
}

export async function confirmarSaldoPendenteInstalacao(
  osId: string,
  acknowledged: boolean,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { error } = await supabase
      .from("ordens_servico")
      .update({
        installation_balance_pending_acknowledged: acknowledged,
        ...(acknowledged
          ? {
              installation_payment_received: false,
              installation_payment_amount: null,
              installation_payment_method: null,
              installation_payment_notes: null,
            }
          : {}),
      })
      .eq("id", osId);

    if (error) return { ok: false, message: error.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error confirming balance",
    };
  }
}

export async function salvarObservacoesExecucaoInstalacao(
  osId: string,
  notes: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { error } = await supabase
      .from("ordens_servico")
      .update({ installation_execution_notes: notes.trim() || null })
      .eq("id", osId);

    if (error) return { ok: false, message: error.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving notes",
    };
  }
}

async function registrarEventoInstalacaoConcluida(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
  },
): Promise<ActionResult> {
  const { error } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: "installation_completed",
    etapa: "installation",
    status: "completed",
    titulo: "installation_completed",
    descricao: null,
    ...spreadAgendaEventoDatetime(new Date().toISOString()),
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, id: params.ordem_servico_id };
}

async function retornarOsAoProjetoInstalacaoParcial(
  supabase: SupabaseClient,
  osId: string,
  userId: string,
  ambientes: OsAmbiente[],
): Promise<ActionResult> {
  const ret = await retornarOsInstalacaoAoProjeto(
    supabase,
    osId,
    userId,
    ambientes,
  );
  if (!ret.ok) return ret;
  return { ok: true, id: ret.id };
}

export async function salvarStatusAmbienteInstalacao(
  osId: string,
  ambienteId: string,
  capture: AmbienteInstalacaoCapture,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const status = parseOsAmbienteInstalacaoStatus(capture.status);

    if (status === "blocked" && capture.bloqueio_categoria && capture.bloqueio_motivo) {
      const blockErr = validarCapturaBloqueioAmbiente(
        capture.bloqueio_categoria,
        capture.bloqueio_motivo,
      );
      if (blockErr) return { ok: false, message: blockErr };
    }

    if (status === "completed") {
      const { count, error: photoErr } = await supabase
        .from("os_anexos")
        .select("id", { count: "exact", head: true })
        .eq("ordem_servico_id", osId)
        .eq("os_ambiente_id", ambienteId)
        .eq("tipo", OS_ANEXO_TIPO_INSTALLATION);

      if (photoErr) return { ok: false, message: photoErr.message };
      if (!count) {
        return {
          ok: false,
          message: "Upload at least one installation photo for this environment before marking it completed.",
        };
      }
    }

    const updateRow: Record<string, unknown> = {
      instalacao_status: status,
      instalacao_bloqueio_categoria: null,
      instalacao_bloqueio_motivo: null,
      instalacao_bloqueio_observacao: null,
      instalacao_concluida_em: null,
    };

    if (status === "completed") {
      updateRow.instalacao_concluida_em = new Date().toISOString();
    } else if (status === "blocked") {
      updateRow.instalacao_bloqueio_categoria =
        capture.bloqueio_categoria?.trim() ?? null;
      updateRow.instalacao_bloqueio_motivo =
        capture.bloqueio_motivo?.trim() ?? null;
      updateRow.instalacao_bloqueio_observacao =
        capture.bloqueio_observacao?.trim() || null;
    }

    const { error } = await supabase
      .from("os_ambientes")
      .update(updateRow)
      .eq("id", ambienteId)
      .eq("ordem_servico_id", osId)
      .eq("ativo", true);

    if (error) return { ok: false, message: error.message };

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving environment status",
    };
  }
}

export async function finalizarInstalacao(osId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const loaded = await loadOsInstalacao(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { os } = loaded;

    const [{ data: ambientes, error: ambErr }, { data: fotosRows, error: fotosErr }] =
      await Promise.all([
        supabase
          .from("os_ambientes")
          .select("*")
          .eq("ordem_servico_id", osId)
          .eq("ativo", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("os_anexos")
          .select("os_ambiente_id")
          .eq("ordem_servico_id", osId)
          .eq("tipo", OS_ANEXO_TIPO_INSTALLATION),
      ]);

    if (ambErr) return { ok: false, message: ambErr.message };
    if (fotosErr) return { ok: false, message: fotosErr.message };

    const ambientesList = (ambientes ?? []) as OsAmbiente[];
    const fotosList = (fotosRows ?? []) as Pick<OsAnexo, "os_ambiente_id">[];

    let modoFinalizacao: { ok: true; modo: "completa" | "parcial_projeto" } | { ok: false; message: string };

    if (ambientesList.length > 0) {
      modoFinalizacao = validarFinalizacaoInstalacaoAmbientes(ambientesList, fotosList);
      if (!modoFinalizacao.ok) return { ok: false, message: modoFinalizacao.message };
    } else {
      const { count: photoCount, error: photoErr } = await supabase
        .from("os_anexos")
        .select("id", { count: "exact", head: true })
        .eq("ordem_servico_id", osId)
        .eq("tipo", OS_ANEXO_TIPO_INSTALLATION);

      if (photoErr) return { ok: false, message: photoErr.message };
      if (!photoCount) {
        return {
          ok: false,
          message: "Upload at least one installation photo.",
        };
      }
      modoFinalizacao = { ok: true, modo: "completa" };
    }

    const { data: checklist, error: listErr } = await supabase
      .from("os_separation_list_items")
      .select("id, quantity, qty_checked")
      .eq("ordem_servico_id", osId);

    if (listErr) return { ok: false, message: listErr.message };

    for (const item of checklist ?? []) {
      if (!isSeparationItemChecked(item)) {
        return {
          ok: false,
          message: "Check all items on the separation list.",
        };
      }
    }

    const financial = buildInstallationFinancialStatus(os);
    if (financial.balance > 0) {
      if (os.installation_payment_received) {
        if (
          os.installation_payment_amount == null ||
          os.installation_payment_amount <= 0 ||
          !parseVisitPaymentMethod(os.installation_payment_method)
        ) {
          return {
            ok: false,
            message: "Enter the amount and payment method for the balance received.",
          };
        }
      } else if (!os.installation_balance_pending_acknowledged) {
        return {
          ok: false,
          message:
            "Registre o recebimento do saldo ou confirme que o saldo permanece pendente.",
        };
      }
    }

    if (modoFinalizacao.modo === "parcial_projeto") {
      if (os.repair_ativo) {
        return {
          ok: false,
          message: "Repair flow cannot return to Project with blocked environments.",
        };
      }
      const ret = await retornarOsAoProjetoInstalacaoParcial(
        supabase,
        osId,
        userId,
        ambientesList,
      );
      if (!ret.ok) return ret;
      revalidateOs(osId);
      return { ok: true, id: osId, modo: "parcial_projeto" };
    }

    if (os.repair_ativo) {
      const repairVal = await validarRepairProntoParaFinalizar(supabase, osId);
      if (!repairVal.ok) return repairVal;
    }

    const ev = await registrarEventoInstalacaoConcluida(supabase, {
      ordem_servico_id: osId,
      cliente_id: os.cliente_id,
      equipe_id: os.equipe_id,
      responsavel_id: userId,
    });
    if (!ev.ok) return ev;

    if (os.repair_ativo) {
      const repairClose = await concluirRepairEpisode(supabase, osId, userId);
      if (!repairClose.ok) return repairClose;
    }

    const trans = await transicionarEtapaOrdemServico(osId, "completed");
    if (!trans.ok) return trans;

    revalidateOs(osId);
    return { ok: true, id: osId, modo: "completa" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error completing installation",
    };
  }
}

export async function listarItensChecklistInstalacao(
  osId: string,
): Promise<{ itens: OsSeparationListItem[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await supabase
      .from("os_separation_list_items")
      .select("*, catalogo_itens ( id, nome, categoria, unidade )")
      .eq("ordem_servico_id", osId)
      .order("sort_order", { ascending: true })
      .order("criado_em", { ascending: true });

    if (error) return { itens: [], error: error.message };
    return {
      itens: ((data ?? []) as SeparationListRow[]).map(mapSeparationListRow),
    };
  } catch (e) {
    return {
      itens: [],
      error: e instanceof Error ? e.message : "Error listing checklist",
    };
  }
}
