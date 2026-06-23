"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  CentroIcon,
  type CentroIconId,
} from "@/components/admin/centro-operacional/centro-operacional-icons";

export type CentroAdminMenuItem = {
  href: string;
  label: string;
  icon: CentroIconId;
};

/** Itens ativos do menu administrativo do Centro Operacional. */
export const CENTRO_ADMIN_MENU_ITEMS: CentroAdminMenuItem[] = [
  { href: "/admin/usuarios", label: "Users", icon: "users" },
  { href: "/admin/equipes", label: "Teams", icon: "clipboard" },
  { href: "/admin/contractors", label: "Contractors", icon: "wrench" },
  { href: "/admin/unidades", label: "Units", icon: "building" },
  { href: "/admin/estoque", label: "Inventory", icon: "box" },
  { href: "/admin/financeiro", label: "Financial", icon: "dollar" },
];

/**
 * Reservado para expansão futura (Configurações, Permissões, Integrações, etc.).
 * Adicionar entradas em `CENTRO_ADMIN_MENU_ITEMS` ou seções separadas quando existirem rotas.
 */
export const CENTRO_ADMIN_MENU_FUTURE_ITEMS: CentroAdminMenuItem[] = [];

type Props = {
  items?: CentroAdminMenuItem[];
  /** Quando definido, os itens viram botões (ex.: abrir modal) em vez de navegar. */
  onSelect?: (item: CentroAdminMenuItem) => void;
  isItemDisabled?: (item: CentroAdminMenuItem) => boolean;
  disabledItemHint?: (item: CentroAdminMenuItem) => string | null;
};

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

export function CentroAdminMenu({
  items = CENTRO_ADMIN_MENU_ITEMS,
  onSelect,
  isItemDisabled,
  disabledItemHint,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        left: rect.right,
        minWidth: Math.max(rect.width, 176),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const menu =
    open && mounted && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              transform: "translateX(-100%)",
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-ds border border-cc-border bg-cc-surface py-1 shadow-lift"
          >
            {items.map((item) => {
              const disabled = isItemDisabled?.(item) ?? false;
              const hint = disabled ? disabledItemHint?.(item) ?? undefined : undefined;

              return onSelect ? (
                <button
                  key={item.href}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  title={hint}
                  onClick={() => {
                    if (disabled) return;
                    setOpen(false);
                    onSelect(item);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                    disabled
                      ? "cursor-not-allowed text-cc-muted opacity-45"
                      : "text-cc-deep hover:bg-cc-canvas"
                  }`}
                >
                  <CentroIcon id={item.icon} className="h-4 w-4 shrink-0 text-cc-muted" />
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-disabled={disabled}
                  title={hint}
                  onClick={(event) => {
                    if (disabled) {
                      event.preventDefault();
                      return;
                    }
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    disabled
                      ? "pointer-events-none cursor-not-allowed text-cc-muted opacity-45"
                      : "text-cc-deep hover:bg-cc-canvas"
                  }`}
                >
                  <CentroIcon id={item.icon} className="h-4 w-4 shrink-0 text-cc-muted" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative z-20 inline-flex cursor-pointer items-center gap-1 rounded-ds px-1 py-0.5 text-right transition-colors hover:bg-white/10"
      >
        <span className="text-xs text-cc-subtle">Administrator</span>
        <span
          className={`text-[10px] text-cc-subtle transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {menu}
    </>
  );
}
