"use client";

import Image from "next/image";
import Link from "next/link";

import {
  CentroIcon,
  IconCalendar,
  type CentroIconId,
} from "@/components/admin/centro-operacional/centro-operacional-icons";
import { PwaInstallPrompt } from "@/components/layout/pwa-install-prompt";
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

        <div className="relative z-10 px-3 pb-3 pt-3 sm:px-4">
          <div className="flex items-center gap-3">
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
                <strong className="block max-w-[7rem] truncate text-sm font-medium text-white sm:max-w-[10rem]">
                  {viewerNome}
                </strong>
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${config.accent.badge}`}
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
            className={`mt-3 grid ${navCols} gap-2`}
            aria-label={t("nav.navAria", { role: config.roleLabel.toLowerCase() })}
          >
            {config.nav.map((item) => {
              const active = item.id === activeTab;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex flex-col items-center gap-1.5 rounded-ds-lg border px-2 py-2.5 transition-all duration-200 active:scale-[0.98] ${
                    active
                      ? "border-white/25 bg-white text-cc-ink shadow-sheet"
                      : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      active ? config.accent.iconActive : config.accent.iconIdle
                    }`}
                  >
                    <NavIcon icon={item.icon} className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] sm:text-[11px]">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-3 pb-20 pt-3 sm:pb-6 sm:pt-4">
        {children}
      </main>

      <PwaInstallPrompt />
    </div>
  );
}

/** @deprecated use CampoShell */
export const ComercialShell = CampoShell;
