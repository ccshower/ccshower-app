"use server";

import { revalidatePath } from "next/cache";

import { transicionarEtapaOrdemServico } from "@/app/ordens-servico/actions";
import { verificarOsFluxoLiberado } from "@/app/ordens-servico/bloqueio-operacional-actions";
import { spreadAgendaEventoDatetime } from "@/lib/ordens-servico/agenda-evento-query";
import {
  formatMoneyUsd,
  parseFinancialDecision,
  parseValorTotalInput,
} from "@/lib/ordens-servico/financial-workspace";
import { parseOsStage } from "@/lib/ordens-servico/operacional-snapshot";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; message: string };

function mapDbError(message: string): string {
  if (message.includes("financial_decision")) {
    return "Database out of date: apply migration supabase/migrations/20250522120000_os_financial_decision.sql in Supabase (SQL Editor).";
  }
  if (message.includes("valor_previsto")) {
    return "Database out of date: apply migration supabase/migrations/20250522130000_ensure_valor_previsto.sql in Supabase (SQL Editor).";
  }
  if (
    message.includes("valor_comercial") ||
    message.includes("valor_projeto") ||
    message.includes("valor_final")
  ) {
    return "Database out of date: apply migration supabase/migrations/20250602100000_os_valores_etapa.sql in Supabase.";
  }
  return message;
}

async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expired");
  return { supabase, userId: user.id };
}

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/operacao");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

type LoadOsFinanceiroResult =
  | { error: string }
  | {
      os: {
        id: string;
        cliente_id: string;
        equipe_id: string;
        responsavel_id: string | null;
        financial_decision: ReturnType<typeof parseFinancialDecision>;
        valor_comercial: number | null;
        valor_projeto: number | null;
        valor_final: number | null;
        valor_previsto: number | null;
      };
    };

async function loadOsFinanceiro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  osId: string,
): Promise<LoadOsFinanceiroResult> {
  const { data, error } = await supabase
    .from("ordens_servico")
    .select(
      "id, cliente_id, etapa_atual, equipe_atual_id, equipe_id, responsavel_id, financial_decision, valor_comercial, valor_projeto, valor_final, valor_previsto",
    )
    .eq("id", osId)
    .single();

  if (error || !data) {
    return { error: mapDbError(error?.message ?? "Work order not found") };
  }

  if (parseOsStage(data.etapa_atual as string) !== "financial_review") {
    return { error: "Work order is not in the financial stage" };
  }

  const equipe_id =
    (data.equipe_atual_id as string | null) ?? (data.equipe_id as string | null);
  if (!equipe_id) {
    return { error: "Work order has no team for financial operation" };
  }

  return {
    os: {
      id: data.id as string,
      cliente_id: data.cliente_id as string,
      equipe_id,
      responsavel_id: data.responsavel_id as string | null,
      financial_decision: parseFinancialDecision(
        data.financial_decision as string,
      ),
      valor_comercial: data.valor_comercial as number | null,
      valor_projeto: data.valor_projeto as number | null,
      valor_final: data.valor_final as number | null,
      valor_previsto: data.valor_previsto as number | null,
    },
  };
}

async function registrarEventoFinanceiro(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    ordem_servico_id: string;
    cliente_id: string;
    equipe_id: string;
    responsavel_id: string | null;
    tipo_evento: "financial_approved" | "financial_rejected";
    descricao: string;
  },
) {
  const { error } = await supabase.from("agenda_eventos").insert({
    ordem_servico_id: params.ordem_servico_id,
    cliente_id: params.cliente_id,
    equipe_id: params.equipe_id,
    responsavel_id: params.responsavel_id,
    tipo_evento: params.tipo_evento,
    etapa: "financial_review",
    status: "completed",
    titulo: params.tipo_evento,
    descricao: params.descricao,
    ...spreadAgendaEventoDatetime(new Date().toISOString()),
  });

  if (error) return { ok: false as const, message: error.message };
  return { ok: true as const };
}

/** Persiste apenas `valor_final` — não altera valor comercial nem projeto. */
export async function atualizarValorFinalFinanceiro(
  osId: string,
  valorRaw: string,
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAuth();
    const loaded = await loadOsFinanceiro(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const parsed = parseValorTotalInput(valorRaw);
    if (!parsed.ok) return parsed;

    const { error } = await supabase
      .from("ordens_servico")
      .update({ valor_final: parsed.value })
      .eq("id", osId);

    if (error) return { ok: false, message: mapDbError(error.message) };
    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: mapDbError(
        e instanceof Error ? e.message : "Error saving contracted final amount",
      ),
    };
  }
}

/** @deprecated Use atualizarValorFinalFinanceiro */
export async function atualizarValorTotalFinanceiro(
  osId: string,
  valorRaw: string,
): Promise<ActionResult> {
  return atualizarValorFinalFinanceiro(osId, valorRaw);
}

export async function aprovarFinanceiro(osId: string): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const bloqueioFluxo = await verificarOsFluxoLiberado(supabase, osId);
    if (bloqueioFluxo) return bloqueioFluxo;

    const loaded = await loadOsFinanceiro(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const { os } = loaded;
    if (os.financial_decision === "approved") {
      return { ok: false, message: "Financial review already approved" };
    }

    const valorAprovado =
      os.valor_final ?? os.valor_projeto ?? os.valor_comercial ?? os.valor_previsto;
    if (valorAprovado == null || valorAprovado <= 0) {
      return {
        ok: false,
        message: "Enter the contracted final amount before approving",
      };
    }

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update({
        financial_decision: "approved",
        financial_rejection_reason: null,
      })
      .eq("id", osId);

    if (updErr) return { ok: false, message: mapDbError(updErr.message) };

    const ev = await registrarEventoFinanceiro(supabase, {
      ordem_servico_id: osId,
      cliente_id: os.cliente_id,
      equipe_id: os.equipe_id,
      responsavel_id: userId,
      tipo_evento: "financial_approved",
      descricao: `Valor aprovado: ${formatMoneyUsd(valorAprovado)}`,
    });
    if (!ev.ok) return ev;

    const trans = await transicionarEtapaOrdemServico(osId, "project");
    if (!trans.ok) return trans;

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error approving financial review",
    };
  }
}

export async function reprovarFinanceiro(
  osId: string,
  motivo: string,
): Promise<ActionResult> {
  try {
    const { supabase, userId } = await requireAuth();
    const loaded = await loadOsFinanceiro(supabase, osId);
    if ("error" in loaded) return { ok: false, message: loaded.error };

    const trimmed = motivo.trim();
    if (!trimmed) {
      return { ok: false, message: "Enter the rejection reason" };
    }

    const { error: updErr } = await supabase
      .from("ordens_servico")
      .update({
        financial_decision: "rejected",
        financial_rejection_reason: trimmed,
      })
      .eq("id", osId);

    if (updErr) return { ok: false, message: mapDbError(updErr.message) };

    const ev = await registrarEventoFinanceiro(supabase, {
      ordem_servico_id: osId,
      cliente_id: loaded.os.cliente_id,
      equipe_id: loaded.os.equipe_id,
      responsavel_id: userId,
      tipo_evento: "financial_rejected",
      descricao: trimmed,
    });
    if (!ev.ok) return ev;

    revalidateOs(osId);
    return { ok: true, id: osId };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Error rejecting financial review",
    };
  }
}
