import {
  BLOQUEIO_OPCOES_POR_ETAPA,
  motivoBloqueioPermitido,
} from "@/lib/ordens-servico/bloqueio-operacional";
import type { OsAmbiente, OsAnexo } from "@/lib/types/database";

export const OS_AMBIENTE_INSTALACAO_STATUS = [
  "pending",
  "completed",
  "blocked",
] as const;

export type OsAmbienteInstalacaoStatus =
  (typeof OS_AMBIENTE_INSTALACAO_STATUS)[number];

export type AmbienteInstalacaoCapture = {
  status: OsAmbienteInstalacaoStatus;
  bloqueio_categoria: string | null;
  bloqueio_motivo: string | null;
  bloqueio_observacao: string | null;
};

export function parseOsAmbienteInstalacaoStatus(
  raw: string | null | undefined,
): OsAmbienteInstalacaoStatus {
  if (raw === "completed" || raw === "blocked") return raw;
  return "pending";
}

export function ambienteInstalacaoFromRow(amb: OsAmbiente): AmbienteInstalacaoCapture {
  return {
    status: parseOsAmbienteInstalacaoStatus(amb.instalacao_status),
    bloqueio_categoria: amb.instalacao_bloqueio_categoria ?? null,
    bloqueio_motivo: amb.instalacao_bloqueio_motivo ?? null,
    bloqueio_observacao: amb.instalacao_bloqueio_observacao ?? null,
  };
}

export function isAmbienteInstalacaoConcluido(amb: OsAmbiente): boolean {
  return parseOsAmbienteInstalacaoStatus(amb.instalacao_status) === "completed";
}

export function isAmbienteInstalacaoBloqueado(amb: OsAmbiente): boolean {
  return parseOsAmbienteInstalacaoStatus(amb.instalacao_status) === "blocked";
}

/** OS voltou ao Projeto após instalação parcial (alguns concluídos, outros bloqueados). */
export function osTemRetornoInstalacaoParcial(ambientes: OsAmbiente[]): boolean {
  if (ambientes.length === 0) return false;
  let completed = 0;
  let blocked = 0;
  for (const amb of ambientes) {
    const status = parseOsAmbienteInstalacaoStatus(amb.instalacao_status);
    if (status === "completed") completed++;
    if (status === "blocked") blocked++;
  }
  return completed > 0 && blocked > 0;
}

/** No Projeto pós-instalação parcial: só ambientes bloqueados podem ser editados. */
export function isAmbienteProjetoEditavel(amb: OsAmbiente, ambientes: OsAmbiente[]): boolean {
  if (!osTemRetornoInstalacaoParcial(ambientes)) return true;
  return isAmbienteInstalacaoBloqueado(amb);
}

export function ambientesInstalacaoBloqueados(ambientes: OsAmbiente[]): OsAmbiente[] {
  return ambientes.filter(isAmbienteInstalacaoBloqueado);
}

export function ambientesInstalacaoConcluidos(ambientes: OsAmbiente[]): OsAmbiente[] {
  return ambientes.filter(isAmbienteInstalacaoConcluido);
}

export type ResumoRetornoInstalacaoParcial = {
  instalados: string[];
  bloqueados: { nome: string; motivo: string | null }[];
};

export function resumoRetornoInstalacaoParcial(
  ambientes: OsAmbiente[],
): ResumoRetornoInstalacaoParcial | null {
  if (!osTemRetornoInstalacaoParcial(ambientes)) return null;
  return {
    instalados: ambientesInstalacaoConcluidos(ambientes).map(
      (a) => a.nome?.trim() || "Ambiente",
    ),
    bloqueados: ambientesInstalacaoBloqueados(ambientes).map((a) => ({
      nome: a.nome?.trim() || "Ambiente",
      motivo: a.instalacao_bloqueio_motivo ?? null,
    })),
  };
}

export function categoriasBloqueioAmbienteInstalacao(): string[] {
  return BLOQUEIO_OPCOES_POR_ETAPA.installation.map((o) => o.categoria);
}

export function motivosBloqueioAmbienteInstalacao(categoria: string): string[] {
  const grupo = BLOQUEIO_OPCOES_POR_ETAPA.installation.find(
    (o) => o.categoria === categoria,
  );
  return grupo ? [...grupo.motivos] : [];
}

export function validarCapturaBloqueioAmbiente(
  categoria: string | null | undefined,
  motivo: string | null | undefined,
): string | null {
  const cat = categoria?.trim() ?? "";
  const mot = motivo?.trim() ?? "";
  if (!cat || !mot) {
    return "Select block category and reason for this environment.";
  }
  if (!motivoBloqueioPermitido("installation", cat, mot)) {
    return "Invalid block reason for installation.";
  }
  return null;
}

export type ValidacaoFinalizacaoInstalacao =
  | { ok: true; modo: "completa" | "parcial_projeto" }
  | { ok: false; message: string };

/** Valida ambientes antes de finalizar instalação (multi-banheiro). */
export function validarFinalizacaoInstalacaoAmbientes(
  ambientes: OsAmbiente[],
  fotos: Pick<OsAnexo, "os_ambiente_id">[],
): ValidacaoFinalizacaoInstalacao {
  if (ambientes.length === 0) {
    return { ok: true, modo: "completa" };
  }

  const fotosPorAmbiente = new Map<string, number>();
  for (const f of fotos) {
    if (!f.os_ambiente_id) continue;
    fotosPorAmbiente.set(
      f.os_ambiente_id,
      (fotosPorAmbiente.get(f.os_ambiente_id) ?? 0) + 1,
    );
  }

  let completed = 0;
  let blocked = 0;

  for (const amb of ambientes) {
    const nome = amb.nome?.trim() || "Environment";
    const status = parseOsAmbienteInstalacaoStatus(amb.instalacao_status);

    if (status === "pending") {
      return {
        ok: false,
        message: `${nome}: mark as completed or blocked before finishing.`,
      };
    }

    if (status === "completed") {
      if ((fotosPorAmbiente.get(amb.id) ?? 0) < 1) {
        return {
          ok: false,
          message: `${nome}: upload at least one installation photo.`,
        };
      }
      completed++;
      continue;
    }

    const blockErr = validarCapturaBloqueioAmbiente(
      amb.instalacao_bloqueio_categoria,
      amb.instalacao_bloqueio_motivo,
    );
    if (blockErr) {
      return { ok: false, message: `${nome}: ${blockErr}` };
    }
    blocked++;
  }

  if (completed === 0 && blocked > 0) {
    return {
      ok: false,
      message: "At least one environment must be completed to finish.",
    };
  }

  if (blocked > 0) {
    return { ok: true, modo: "parcial_projeto" };
  }

  return { ok: true, modo: "completa" };
}
