"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

export function OperationalModal({ open, title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      className={`z-[120] w-[calc(100%-1.5rem)] rounded-ds-lg border border-cc-border bg-cc-surface p-0 text-base font-light shadow-lift backdrop:bg-black/30 open:animate-none ${wide ? "max-w-2xl" : "max-w-md"}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="border-b border-cc-border px-4 py-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-cc-deep">
          {title}
        </h2>
      </div>
      <div className="max-h-[min(70vh,520px)] overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
        {children}
      </div>
    </dialog>,
    document.body,
  );
}
