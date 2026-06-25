"use client";

import {
  IconActivity,
  IconAlert,
  IconCalendar,
  IconClipboard,
} from "@/components/admin/centro-operacional/centro-operacional-icons";

const TABS = [
  { id: "centro-overview", label: "Overview", Icon: IconActivity },
  { id: "centro-queues", label: "Queues", Icon: IconClipboard },
  { id: "centro-attention", label: "Alerts", Icon: IconAlert },
  { id: "centro-agenda", label: "Schedule", Icon: IconCalendar },
] as const;

export function CentroMobileNav() {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top, behavior: "smooth" });
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cc-border bg-cc-surface/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Dashboard sections"
    >
      <div className="grid grid-cols-4 gap-0.5 px-1 pt-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className="flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-ds px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-cc-muted transition active:bg-cc-canvas active:text-cc-ink"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
