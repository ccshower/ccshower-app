"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "accent" | "danger";

const variantClass: Record<Variant, string> = {
  default:
    "text-cc-subtle hover:bg-cc-border-light/80 hover:text-cc-deep",
  accent:
    "text-cc-subtle hover:bg-cc-blue-soft/50 hover:text-cc-blue-deep",
  danger:
    "text-cc-subtle hover:bg-cc-red-soft/60 hover:text-cc-red",
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  variant?: Variant;
  children: ReactNode;
};

export function IconActionButton({
  label,
  variant = "default",
  className = "",
  disabled,
  children,
  ...rest
}: Props) {
  return (
    <span className="group/tooltip relative inline-flex">
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent shadow-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35 ${variantClass[variant]} ${className}`}
        {...rest}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-sm bg-cc-ink px-2 py-0.5 text-[10px] font-medium tracking-wide text-white opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
