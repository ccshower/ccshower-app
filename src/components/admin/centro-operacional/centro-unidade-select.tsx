"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import type { Unidade } from "@/lib/types/database";

const TODAS_LABEL = "All units";

type MenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

function IconMapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1118 0z"
      />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function CentroUnidadeSelect({
  unidades,
  selectedId,
}: {
  unidades: Unidade[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

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
        left: rect.left,
        minWidth: Math.max(rect.width, 200),
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

  const selected = unidades.find((u) => u.id === selectedId) ?? null;
  const label = selected ? selected.nome : TODAS_LABEL;

  function selecionar(id: string | null) {
    setOpen(false);
    if (id === selectedId) return;
    const basePath = pathname ?? "/admin/centro-operacional";
    startTransition(() => {
      router.replace(id ? `${basePath}?unidade=${id}` : basePath, {
        scroll: false,
      });
    });
  }

  const options: { id: string | null; nome: string }[] = [
    { id: null, nome: TODAS_LABEL },
    ...unidades.map((u) => ({
      id: u.id,
      nome: u.matriz ? `${u.nome} · Headquarters` : u.nome,
    })),
  ];

  const menu =
    open && mounted && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Unit"
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              minWidth: menuPos.minWidth,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-ds border border-cc-border bg-cc-surface py-1 shadow-lift"
          >
            {options.map((opt) => {
              const active = (opt.id ?? null) === (selectedId ?? null);
              return (
                <button
                  key={opt.id ?? "todas"}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selecionar(opt.id)}
                  className={`block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors hover:bg-cc-canvas ${
                    active ? "font-medium text-cc-ink" : "text-cc-deep"
                  }`}
                >
                  {opt.nome}
                </button>
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
        aria-haspopup="listbox"
        aria-label="Filter by unit"
        className={`group flex cursor-pointer items-center gap-2 rounded-ds border border-white/10 px-2.5 py-1.5 transition-all duration-200 hover:border-white/25 hover:bg-white/10 active:scale-[0.98] ${
          isPending ? "opacity-60" : ""
        }`}
      >
        <IconMapPin className="h-4 w-4 shrink-0 text-cc-rose/90 transition-colors group-hover:text-cc-rose" />
        <span className="max-w-[9rem] truncate text-sm font-medium text-white sm:max-w-[12rem]">
          {label}
        </span>
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
