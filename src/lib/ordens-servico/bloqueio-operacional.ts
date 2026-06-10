import type { OsWorkflowStage } from "@/lib/ordens-servico/workflow";

/** Stages that accept operational block registration. */
export type BloqueioOperacionalEtapa = Exclude<
  OsWorkflowStage,
  "blocked" | "completed"
>;

export const BLOQUEIO_STATUS_ATIVO = "ativo" as const;
export const BLOQUEIO_STATUS_RESOLVIDO = "resolvido" as const;

/** Operational category — material block. */
export const BLOQUEIO_CATEGORIA_MATERIAL = "Material";

/** Timeline message when returning work order to Project. */
export const BLOQUEIO_MATERIAL_RETORNO_PROJETO_EVENTO =
  "Work order returned to Project due to material block at Installation";

export const BLOQUEIO_MATERIAL_MOTIVOS_INSTALACAO = [
  "Broken glass",
  "Glass out of measure",
  "Incorrect material",
  "Missing material",
  "Incorrect hardware",
] as const;

export type OsCrashStatus =
  | typeof BLOQUEIO_STATUS_ATIVO
  | typeof BLOQUEIO_STATUS_RESOLVIDO;

export const BLOQUEIO_OPCOES_POR_ETAPA: Record<
  BloqueioOperacionalEtapa,
  readonly { categoria: string; motivos: readonly string[] }[]
> = {
  commercial: [
    {
      categoria: "Client",
      motivos: [
        "Client asked to wait",
        "Client was not on site",
        "Client cancelled",
      ],
    },
    {
      categoria: "Financing",
      motivos: [
        "Credit declined",
        "Bank requested documentation",
        "Client awaiting new review",
        "Client not approved by bank",
      ],
    },
  ],
  financial_review: [
    {
      categoria: "Financial",
      motivos: ["Awaiting deposit", "Client with outstanding balance"],
    },
    {
      categoria: "Financing",
      motivos: [
        "Credit declined",
        "Financing pending",
        "Client awaiting new approval",
      ],
    },
  ],
  project: [
    {
      categoria: "Material",
      motivos: ["Glass unavailable", "Material unavailable"],
    },
    {
      categoria: "Project",
      motivos: ["Project under review"],
    },
  ],
  installation: [
    {
      categoria: BLOQUEIO_CATEGORIA_MATERIAL,
      motivos: BLOQUEIO_MATERIAL_MOTIVOS_INSTALACAO,
    },
    {
      categoria: "Client",
      motivos: ["Client was not on site"],
    },
    {
      categoria: "Site",
      motivos: ["Invalid address"],
    },
  ],
};

export function isBloqueioOperacionalEtapa(
  etapa: string,
): etapa is BloqueioOperacionalEtapa {
  return etapa in BLOQUEIO_OPCOES_POR_ETAPA;
}

export function categoriasBloqueioParaEtapa(
  etapa: BloqueioOperacionalEtapa,
): string[] {
  return BLOQUEIO_OPCOES_POR_ETAPA[etapa].map((o) => o.categoria);
}

export function motivosBloqueioParaEtapaCategoria(
  etapa: BloqueioOperacionalEtapa,
  categoria: string,
): string[] {
  const grupo = BLOQUEIO_OPCOES_POR_ETAPA[etapa].find(
    (o) => o.categoria === categoria,
  );
  return grupo ? [...grupo.motivos] : [];
}

export function motivoBloqueioPermitido(
  etapa: BloqueioOperacionalEtapa,
  categoria: string,
  motivo: string,
): boolean {
  return motivosBloqueioParaEtapaCategoria(etapa, categoria).includes(motivo);
}

/** Material block at Installation returns the work order to Project stage. */
export function bloqueioMaterialInstalacaoRequerRetornoProjeto(
  etapa: BloqueioOperacionalEtapa,
  categoria: string,
): boolean {
  return etapa === "installation" && categoria === BLOQUEIO_CATEGORIA_MATERIAL;
}
