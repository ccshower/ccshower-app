"use client";

import { t } from "@/lib/i18n";

/** Placeholder — visualização mensal será implementada em etapa futura. */
export function CalendarMonthView() {
  return (
    <section className="rounded-sm border border-dashed border-cc-border bg-cc-surface/30 px-6 py-16 text-center">
      <p className="font-display text-lg font-light text-cc-ink">
        {t("calendar.monthComingSoon")}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm font-light text-cc-muted">
        {t("calendar.monthComingSoonHint")}
      </p>
    </section>
  );
}
