"use client";

import Image from "next/image";
import Link from "next/link";

import {
  CentroIcon,
  IconCalendar,
  type CentroIconId,
} from "@/components/admin/centro-operacional/centro-operacional-icons";
import { formatCentroHeaderDate } from "@/lib/centro-operacional/centro-header-date";
import { t } from "@/lib/i18n";
import {
  CAMPO_PROFILES,
  type CampoNavIcon,
  type CampoNavTab,
  type CampoProfileId,
} from "@/lib/auth/campo-nav";

type Props = {
  children: React.ReactNode;
  viewerNome: string;
  profile: CampoProfileId;
  activeTab: CampoNavTab;
};

function NavIcon({ icon, className }: { icon: CampoNavIcon; className?: string }) {
  if (icon === "calendar") {
    return <IconCalendar className={className} />;
  }
  return <CentroIcon id={icon as CentroIconId} className={className} />;
}

function CampoNavLink({
  item,
  active,
  accent,
  layout,
}: {
  item: (typeof CAMPO_PROFILES)[CampoProfileId]["nav"][number];
  active: boolean;
  accent: (typeof CAMPO_PROFILES)[CampoProfileId]["accent"];
  layout: "header" | "bottom";
}) {
  const isBottom = layout === "bottom";

  return (
    <Link
      href={item.href}
      className={
        isBottom
          ? `flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:scale-[0.98] ${
              active ? "text-cc-ink" : "text-cc-muted"
            }`
          : `group flex flex-col items-center gap-1.5 rounded-ds-lg border px-2 py-2.5 transition-all duration-200 active:scale-[0.98] ${
              active
                ? "border-white/25 bg-white text-cc-ink shadow-sheet"
                : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
            }`
      }
      aria-current={active ? "page" : undefined}
    >
      <span
        className={`flex items-center justify-center rounded-full transition-colors ${
          isBottom
            ? `h-8 w-8 ${active ? accent.iconActive : "bg-cc-canvas text-cc-muted"}`
            : `h-9 w-9 ${active ? accent.iconActive : accent.iconIdle}`
        }`}
      >
        <NavIcon icon={item.icon} className="h-4 w-4" />
      </span>
      <span
        className={`font-semibold uppercase tracking-[0.06em] ${
          isBottom ? "text-[10px]" : "text-[10px] sm:text-[11px]"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function CampoShell({ children, viewerNome, profile, activeTab }: Props) {
  const config = CAMPO_PROFILES[profile];
  const headerDate = formatCentroHeaderDate();
  const navCols =
    config.nav.length === 2
      ? "grid-cols-2"
      : config.nav.length === 3
        ? "grid-cols-3"
        : config.nav.length === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-1";

  return (
    <div className="flex min-h-dvh flex-col bg-cc-canvas">
      <header className="sticky top-0 z-20 bg-cc-ink text-white shadow-sheet">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-16 -top-16 h-48 w-48 rounded-full"
            style={{ background: config.accent.glow }}
          />
        </div>

        <div
          className="relative z-10 px-3 pb-3 pt-3 sm:px-4"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="shrink-0 rounded-ds bg-white px-2 py-1.5 shadow-sheet">
              <Image
                src="/logo.png"
                alt="CC Shower Door"
                width={88}
                height={26}
                className="h-5 w-auto sm:h-6"
                priority
              />
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-1.5 rounded-ds border border-white/10 px-2 py-1 sm:flex">
                <IconCalendar className="h-3.5 w-3.5 text-white/70" />
                <span className="text-xs font-medium tabular-nums text-white">
                  {headerDate}
                </span>
              </div>

              <div className="min-w-0 text-right">
                <strong className="block max-w-[6rem] truncate text-sm font-medium text-white sm:max-w-[10rem]">
                  {viewerNome}
                </strong>
                <span
                  className={`mt-0.5 inline-flex max-w-[6rem] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] sm:max-w-none ${config.accent.badge}`}
                >
                  <CentroIcon id={config.badgeIcon} className="h-3 w-3 shrink-0" />
                  {config.roleLabel}
                </span>
              </div>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-sm px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {t("common.signOut")}
                </button>
              </form>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1.5 sm:hidden">
            <IconCalendar className="h-3.5 w-3.5 shrink-0 text-white/70" />
            <span className="text-xs tabular-nums text-white/90">{headerDate}</span>
          </div>

          <nav
            className={`mt-3 hidden md:grid ${navCols} gap-2`}
            aria-label={t("nav.navAria", { role: config.roleLabel.toLowerCase() })}
          >
            {config.nav.map((item) => (
              <CampoNavLink
                key={item.id}
                item={item}
                active={item.id === activeTab}
                accent={config.accent}
                layout="header"
              />
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 pb-bottom-nav pt-3 sm:pb-6 sm:pt-4 md:pb-6">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-cc-border bg-cc-surface/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label={t("nav.navAria", { role: config.roleLabel.toLowerCase() })}
      >
        <div className="flex gap-0.5 px-1 pt-1">
          {config.nav.map((item) => (
            <CampoNavLink
              key={item.id}
              item={item}
              active={item.id === activeTab}
              accent={config.accent}
              layout="bottom"
            />
          ))}
        </div>
      </nav>
    </div>
  );
}

/** @deprecated use CampoShell */
export const ComercialShell = CampoShell;
