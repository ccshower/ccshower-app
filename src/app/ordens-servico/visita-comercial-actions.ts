"use server";

import { revalidatePath } from "next/cache";

import { transicionarEtapaOrdemServico } from "@/app/ordens-servico/actions";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import {
  OS_ANEXOS_BUCKET,
  OS_ANEXO_TIPO_PAYMENT_RECEIPT,
  OS_ANEXO_TIPO_VISITA,
  isVisitaComercialExecucao,
} from "@/lib/ordens-servico/visita-comercial";
import {
  loadOsAnexoUploadContext,
  uploadAnexosVisitaComercialFromFormData,
} from "@/lib/ordens-servico/os-anexo-upload";
import {
  AGENDA_EVENTO_DATETIME_COLUMNS,
  compareAgendaEventoStartAsc,
  mapVisitaInicialResumo,
} from "@/lib/ordens-servico/agenda-evento-query";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import {
  buildFinanciamentoUpdate,
  type FinanciamentoCapture,
} from "@/lib/ordens-servico/os-financiamento";
import { parseValorEtapaInput } from "@/lib/ordens-servico/os-valores-etapa";
import {
  parseVisitPaymentAmount,
  parseVisitPaymentMethod,
  type VisitPaymentCapture,
} from "@/lib/ordens-servico/visit-payment";
import { createClient } from "@/lib/supabase/server";
import type { OsAnexo, OrdemServicoStatus, OrdemServicoWithRelations } from "@/lib/types/database";

export type ActionResult =
  | { ok: true; id?: string; uploaded?: number }
  | { ok: false; message: string };

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

async function loadOsParaVisita(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data: os, error } = await supabase
    .from("ordens_servico")
    .select("id, cliente_id, etapa_atual, status, status_atual")
    .eq("id", id)
    .single();

  if (error || !os) {
    return { error: error?.message ?? "Work order not found" };
  }

  const { data: eventos } = await supabase
    .from("agenda_eventos")
    .select(AGENDA_EVENTO_DATETIME_COLUMNS)
    .eq("ordem_servico_id", id)
    .eq("tipo_evento", "technical_visit");

  const sorted = [...(eventos ?? [])].sort(compareAgendaEventoStartAsc);
  const visita = mapVisitaInicialResumo(sorted[0] ?? null);

  return {
    os: {
      id: os.id as string,
      cliente_id: os.cliente_id as string,
      etapa_atual: os.etapa_atual as string,
      status: os.status as OrdemServicoStatus,
      status_atual: (os.status_atual as string) ?? "commercial_pending",
      visita_inicial: visita,
    },
  };
}

function revalidateOs(osId?: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/clientes");
  revalidatePath("/admin/clientes");
  revalidatePath("/operacao");
  revalidatePath("/calendar");
  revalidatePath("/os", "layout");
  if (osId) revalidatePath(`/os/${osId}`);
}

function buildVisitPaymentUpdate(payload: VisitPaymentCapture):
  | {
      ok: true;
      row: {
        visit_payment_received: boolean;
        visit_payment_amount: number | null;
        visit_payment_method: string | null;
        visit_payment_notes: string | null;
      };
    }
  | { ok: false; message: string } {
  if (!payload.received) {
    return {
      ok: true,
      row: {
        visit_payment_received: false,
        visit_payment_amount: null,
        visit_payment_method: null,
        visit_payment_notes: null,
      },
    };
  }

  let amount: number | null = null;
  if (payload.amount.trim()) {
    const parsed = parseVisitPaymentAmount(payload.amount);
    if (!parsed.ok) return parsed;
    amount = parsed.value;
  }

  const method = payload.method
    ? parseVisitPaymentMethod(payload.method)
    : null;
  if (payload.method && !method) {
    return { ok: false, message: "Invalid payment method" };
  }

  return {
    ok: true,
    row: {
      visit_payment_received: true,
      visit_payment_amount: amount,
      visit_payment_method: method,
      visit_payment_notes: payload.notes.trim() || null,
    },
  };
}

/** Registro operacional — não altera etapa nem workflow financeiro. */
export async function salvarCapturaPagamentoVisita(
  osId: string,
  payload: VisitPaymentCapture,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (parseOsStage(os.etapa_atual) !== "commercial") {
      return { ok: false, message: "Payment capture only in the commercial stage" };
    }
    if (os.status === "completed" || os.status === "cancelled") {
      return { ok: false, message: "Work order closed" };
    }

    const built = buildVisitPaymentUpdate(payload);
    if (!built.ok) return built;

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update(built.row)
      .eq("id", osId);

    if (updErr) return { ok: false, message: updErr.message };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving payment",
    };
  }
}

export async function listarComprovantePagamentoVisita(
  osId: string,
): Promise<{ comprovante: (OsAnexo & { url: string }) | null; error?: string }> {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("os_anexos")
      .select("*")
      .eq("ordem_servico_id", osId)
      .eq("tipo", OS_ANEXO_TIPO_PAYMENT_RECEIPT)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { comprovante: null, error: error.message };
    if (!data) return { comprovante: null };

    const { data: signed } = await supabase.storage
      .from(OS_ANEXOS_BUCKET)
      .createSignedUrl(data.storage_path, 3600);

    return {
      comprovante: {
        ...(data as OsAnexo),
        url: signed?.signedUrl ?? "",
      },
    };
  } catch (e) {
    return {
      comprovante: null,
      error: e instanceof Error ? e.message : "Error loading receipt",
    };
  }
}

function mapDbErrorValores(message: string): string {
  if (
    message.includes("valor_comercial") ||
    message.includes("valor_projeto") ||
    message.includes("valor_final")
  ) {
    return "Database out of date: apply migration supabase/migrations/20250602100000_os_valores_etapa.sql in Supabase.";
  }
  return message;
}

function mapDbErrorFinanciamento(message: string): string {
  if (
    message.includes("forma_pagamento") ||
    message.includes("banco_financiamento")
  ) {
    return "Database out of date: apply migration supabase/migrations/20250603100000_os_financiamento.sql in Supabase.";
  }
  return message;
}

/** Persiste forma de pagamento e dados de financiamento (somente etapa comercial). */
export async function salvarFormaPagamentoComercial(
  osId: string,
  payload: FinanciamentoCapture,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (parseOsStage(os.etapa_atual) !== "commercial") {
      return { ok: false, message: "Payment method only in the commercial stage" };
    }

    const built = buildFinanciamentoUpdate(payload);
    if (!built.ok) return built;

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update(built.row)
      .eq("id", osId);

    if (updErr) {
      return { ok: false, message: mapDbErrorFinanciamento(updErr.message) };
    }
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Error saving payment method",
    };
  }
}

/** Persiste apenas `valor_comercial` — não altera outros valores da OS. */
export async function salvarValorComercial(
  osId: string,
  valorRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (parseOsStage(os.etapa_atual) !== "commercial") {
      return { ok: false, message: "Commercial amount only in the commercial stage" };
    }

    const parsed = parseValorEtapaInput(valorRaw);
    if (!parsed.ok) return parsed;

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update({ valor_comercial: parsed.value })
      .eq("id", osId);

    if (updErr) return { ok: false, message: mapDbErrorValores(updErr.message) };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Error saving commercial amount",
    };
  }
}

export async function salvarAnotacoesVisitaComercial(
  osId: string,
  anotacoes: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (!isVisitaComercialExecucao(os)) {
      return { ok: false, message: "Commercial visit is not in progress" };
    }

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update({ anotacoes_tecnicas: anotacoes.trim() || null })
      .eq("id", osId);

    if (updErr) return { ok: false, message: updErr.message };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error saving notes",
    };
  }
}

/** @deprecated Preferir POST /api/os/[id]/anexos — mantido para compatibilidade */
export async function uploadAnexosVisitaComercial(
  osId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const loaded = await loadOsAnexoUploadContext(supabase, osId);
    if ("error" in loaded) {
      return { ok: false, message: loaded.error };
    }

    const result = await uploadAnexosVisitaComercialFromFormData(
      supabase,
      userId,
      loaded.os,
      formData,
    );

    if (!result.ok) return result;
    revalidateOs(osId);
    return { ok: true, id: result.id, uploaded: result.uploaded };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Upload error",
    };
  }
}

export async function removerAnexoVisitaComercial(
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

    await supabase.storage.from(OS_ANEXOS_BUCKET).remove([row.storage_path]);
    const { error } = await supabase.from("os_anexos").delete().eq("id", anexoId);
    if (error) return { ok: false, message: error.message };

    revalidateOs(row.ordem_servico_id as string);
    return { ok: true, id: row.ordem_servico_id as string };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error removing attachment",
    };
  }
}

export async function finalizarVisitaComercial(
  osId: string,
  anotacoes: string,
  payment?: VisitPaymentCapture,
  financiamento?: FinanciamentoCapture,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const { os, error } = await loadOsParaVisita(supabase, osId);
    if (error || !os) return { ok: false, message: error ?? "Work order not found" };

    if (parseOsStage(os.etapa_atual) !== "commercial") {
      return { ok: false, message: "Work order is not in the commercial stage" };
    }

    if (!os.visita_inicial?.id) {
      return { ok: false, message: "Technical visit not found" };
    }

    const paymentRow = payment ? buildVisitPaymentUpdate(payment) : null;
    if (paymentRow && !paymentRow.ok) return paymentRow;

    const financiamentoRow = financiamento
      ? buildFinanciamentoUpdate(financiamento)
      : null;
    if (financiamentoRow && !financiamentoRow.ok) return financiamentoRow;

    const { error: noteErr } = await supabase
      .from("ordens_servico")
      .update({
        anotacoes_tecnicas: anotacoes.trim() || null,
        status: "in_progress",
        ...(paymentRow?.ok ? paymentRow.row : {}),
        ...(financiamentoRow?.ok ? financiamentoRow.row : {}),
      })
      .eq("id", osId);

    if (noteErr) {
      return { ok: false, message: mapDbErrorFinanciamento(noteErr.message) };
    }

    const { error: evErr } = await supabase
      .from("agenda_eventos")
      .update({ status: "completed" })
      .eq("id", os.visita_inicial.id);

    if (evErr) return { ok: false, message: evErr.message };

    const trans = await transicionarEtapaOrdemServico(osId, "financial_review");
    if (!trans.ok) return trans;

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error completing visit",
    };
  }
}

export async function listarAnexosVisitaComUrls(
  osId: string,
): Promise<{ anexos: (OsAnexo & { url: string })[]; error?: string }> {
  try {
    const { supabase } = await requireAuth();

    const { data, error } = await supabase
      .from("os_anexos")
      .select("*")
      .eq("ordem_servico_id", osId)
      .eq("tipo", OS_ANEXO_TIPO_VISITA)
      .order("criado_em", { ascending: false });

    if (error) return { anexos: [], error: error.message };

    const anexos: (OsAnexo & { url: string })[] = [];
    for (const row of data ?? []) {
      const { data: signed } = await supabase.storage
        .from(OS_ANEXOS_BUCKET)
        .createSignedUrl(row.storage_path, 3600);
      anexos.push({
        ...(row as OsAnexo),
        url: signed?.signedUrl ?? "",
      });
    }

    return { anexos };
  } catch (e) {
    return {
      anexos: [],
      error: e instanceof Error ? e.message : "Error listing attachments",
    };
  }
}
