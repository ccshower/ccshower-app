"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/admin/equipes";

  if (pathname === "/admin/centro-operacional") {
    return children;
  }

  return <AppShell>{children}</AppShell>;
}
