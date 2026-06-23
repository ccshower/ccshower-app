import { t } from "@/lib/i18n";

/** Couting da venda — checkbox na visita comercial (Sales). */
export function coutingFromOrdem(os: {
  couting?: boolean | null;
}): boolean {
  return Boolean(os.couting);
}

export function tCoutingSim(): string {
  return t("os.couting.yes");
}
