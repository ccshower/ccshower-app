import { t } from "@/lib/i18n";

/** Coating da venda — checkbox na visita comercial (Sales). */
export function coatingFromOrdem(os: {
  coating?: boolean | null;
}): boolean {
  return Boolean(os.coating);
}

export function tCoatingYes(): string {
  return t("os.coating.yes");
}
