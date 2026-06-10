"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Rótulo acessível — ex.: nome do cliente */
  ariaLabel: string;
};

/**
 * Shell da operação da OS (não é o OperationalModal de abertura/cadastro).
 * Mobile-first: folha que sobe do rodapé; desktop: painel centralizado.
 */
export function OsOperacionalSheet({ open, onClose, children, ariaLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
      document.body.style.overflow = "hidden";
    } else {
      el.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={ariaLabel}
      className="fixed bottom-0 left-1/2 z-50 m-0 w-full max-w-lg -translate-x-1/2 rounded-t-ds-lg border border-cc-border border-b-0 bg-cc-canvas p-0 shadow-lift backdrop:bg-black/40 open:animate-none sm:bottom-auto sm:top-[50%] sm:max-h-[min(92dvh,720px)] sm:translate-y-[-50%] sm:rounded-ds-lg sm:border-b"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex max-h-[min(92dvh,720px)] flex-col">
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-cc-border sm:hidden"
          aria-hidden
        />
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
          {children}
        </div>
      </div>
    </dialog>
  );
}
