"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Field } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm font-light text-cc-muted">{t("login.forgotPasswordHint")}</p>

      {sent ? (
        <p
          className="rounded-sm border border-cc-blue-soft bg-cc-blue-soft px-3 py-2.5 text-sm font-medium text-cc-blue-deep"
          role="status"
        >
          {t("login.resetEmailSent")}
        </p>
      ) : null}

      {error ? (
        <p
          className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2.5 text-sm font-medium text-cc-red"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const email = String(fd.get("email") ?? "").trim();
          if (!email) return;

          startTransition(async () => {
            setError(null);
            const supabase = createClient();
            const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/login/reset-password")}`;
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo,
            });
            if (resetError) {
              setError(resetError.message);
              return;
            }
            setSent(true);
          });
        }}
      >
        <Field label={t("login.email")}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={sent}
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:opacity-60"
            placeholder={t("login.emailPlaceholder")}
          />
        </Field>

        <button
          type="submit"
          disabled={pending || sent}
          className="flex w-full items-center justify-center rounded-sm bg-cc-ink px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? t("login.sendingResetLink") : t("login.sendResetLink")}
        </button>
      </form>

      <p className="text-center">
        <Link
          href="/login"
          className="text-xs font-medium text-cc-blue-deep underline-offset-2 hover:underline"
        >
          {t("login.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
