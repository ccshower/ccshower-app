import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="block text-xs font-light text-cc-subtle">{hint}</span>
      ) : null}
    </label>
  );
}
