import { t } from "@/lib/i18n";

type Props = {
  compact?: boolean;
  className?: string;
};

/** Dado legado/inconsistente — OS ou cliente sem equipe vinculada. */
export function OsSemEquipeBadge({ compact = false, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-900 ${compact ? "text-[10px]" : "text-[11px]"} ${className}`}
      title={t("equipe.semEquipeHint")}
    >
      {t("equipe.semEquipe")}
    </span>
  );
}
