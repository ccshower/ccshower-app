import { normalizeLegacyKey, LEGACY_CLIENT_TYPE } from "@/lib/operational/legacy-keys";

/** Chaves persistidas em clientes.tipo_cliente */
export const CLIENT_TYPE = [
  "contractor",
  "residential",
  "architect",
  "partner",
  "commercial",
  "other",
] as const;

export type ClientType = (typeof CLIENT_TYPE)[number];

/** @deprecated Use ClientType */
export type TipoCliente = ClientType;

/** @deprecated Use CLIENT_TYPE */
export const TIPO_CLIENTE = CLIENT_TYPE;

const DEFAULT_TYPE: ClientType = "residential";

const TYPE_NO_DEFAULT_INSTALLATION: ClientType[] = [
  "contractor",
  "architect",
  "partner",
];

export function parseClientType(raw: string | null | undefined): ClientType {
  return normalizeLegacyKey(
    raw,
    LEGACY_CLIENT_TYPE,
    CLIENT_TYPE,
    DEFAULT_TYPE,
  ) as ClientType;
}

/** @deprecated Use parseClientType */
export const parseTipoCliente = parseClientType;

export function defaultPossuiInstalacaoPorTipo(type: ClientType): boolean {
  return !TYPE_NO_DEFAULT_INSTALLATION.includes(type);
}

export function parsePossuiInstalacaoFromForm(
  raw: FormDataEntryValue | null,
): boolean {
  const v = String(raw ?? "").trim().toLowerCase();
  return v === "true" || v === "on" || v === "1";
}
