import type { CentroIconId } from "@/components/admin/centro-operacional/centro-operacional-icons";

export type CampoNavTab =
  | "agenda"
  | "operacao"
  | "clientes"
  | "estoque"
  | "fornecedor"
  | "financeiro";
export type CampoProfileId = "commercial" | "installation" | "project" | "financial";
export type CampoNavIcon = "calendar" | CentroIconId;

export type CampoNavItem = {
  id: CampoNavTab;
  label: string;
  href: string;
  icon: CampoNavIcon;
};

export type CampoProfileConfig = {
  id: CampoProfileId;
  roleLabel: string;
  badgeIcon: CentroIconId;
  accent: {
    badge: string;
    iconActive: string;
    iconIdle: string;
    glow: string;
  };
  nav: CampoNavItem[];
};

export const CAMPO_PROFILES: Record<CampoProfileId, CampoProfileConfig> = {
  commercial: {
    id: "commercial",
    roleLabel: "Commercial",
    badgeIcon: "users",
    accent: {
      badge: "border-cc-rose/30 bg-cc-rose/15 text-cc-rose",
      iconActive: "bg-cc-rose/15 text-cc-rose-deep",
      iconIdle: "bg-white/10 text-white/85",
      glow: "radial-gradient(circle, rgba(212,144,138,0.18) 0%, transparent 70%)",
    },
    nav: [
      { id: "agenda", label: "Agenda", href: "/calendar", icon: "calendar" },
      { id: "operacao", label: "Operations", href: "/operacao", icon: "clipboard" },
      { id: "clientes", label: "Clients", href: "/clientes", icon: "users" },
    ],
  },
  installation: {
    id: "installation",
    roleLabel: "Installation",
    badgeIcon: "wrench",
    accent: {
      badge: "border-cc-blue/30 bg-cc-blue/15 text-cc-blue",
      iconActive: "bg-cc-blue/15 text-cc-blue",
      iconIdle: "bg-white/10 text-white/85",
      glow: "radial-gradient(circle, rgba(113,137,168,0.22) 0%, transparent 70%)",
    },
    nav: [
      { id: "agenda", label: "Agenda", href: "/calendar", icon: "calendar" },
      { id: "clientes", label: "Clients", href: "/clientes", icon: "users" },
    ],
  },
  project: {
    id: "project",
    roleLabel: "Project",
    badgeIcon: "pen",
    accent: {
      badge: "border-violet-400/30 bg-violet-400/15 text-violet-200",
      iconActive: "bg-violet-400/20 text-violet-100",
      iconIdle: "bg-white/10 text-white/85",
      glow: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)",
    },
    nav: [
      { id: "agenda", label: "Agenda", href: "/calendar", icon: "calendar" },
      { id: "operacao", label: "Operations", href: "/operacao", icon: "clipboard" },
      { id: "estoque", label: "Inventory", href: "/estoque", icon: "box" },
      { id: "fornecedor", label: "Supplier", href: "/fornecedor", icon: "truck" },
    ],
  },
  financial: {
    id: "financial",
    roleLabel: "Financial",
    badgeIcon: "dollar",
    accent: {
      badge: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
      iconActive: "bg-emerald-400/20 text-emerald-100",
      iconIdle: "bg-white/10 text-white/85",
      glow: "radial-gradient(circle, rgba(52,211,153,0.2) 0%, transparent 70%)",
    },
    nav: [
      { id: "financeiro", label: "Financial", href: "/financeiro", icon: "dollar" },
      { id: "operacao", label: "Operations", href: "/operacao", icon: "clipboard" },
    ],
  },
};

/** @deprecated use CampoNavTab */
export type ComercialNavTab = CampoNavTab;

/** @deprecated use CAMPO_PROFILES.commercial.nav */
export const COMERCIAL_NAV = CAMPO_PROFILES.commercial.nav;
