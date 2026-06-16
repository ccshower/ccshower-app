"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Field } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm font-light text-cc-muted">{t("login.resetPasswordHint")}</p>

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
          const password = String(fd.get("password") ?? "");
          const confirm = String(fd.get("confirmPassword") ?? "");

          if (password.length < 6) {
            setError(t("login.passwordTooShort"));
            return;
          }
          if (password !== confirm) {
            setError(t("login.passwordMismatch"));
            return;
          }

          startTransition(async () => {
            setError(null);
            const supabase = createClient();
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) {
              setError(updateError.message);
              return;
            }
            await supabase.auth.signOut();
            router.replace("/login?sucesso=senha-atualizada");
            router.refresh();
          });
        }}
      >
        <Field label={t("login.newPassword")}>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
            placeholder="••••••••"
          />
        </Field>
        <Field label={t("login.confirmPassword")}>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
            placeholder="••••••••"
          />
        </Field>

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-sm bg-cc-ink px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? t("login.updatingPassword") : t("login.updatePassword")}
        </button>
      </form>

      <p className="text-center">
        <Link
          href="/login/forgot-password"
          className="text-xs font-medium text-cc-blue-deep underline-offset-2 hover:underline"
        >
          {t("login.requestNewResetLink")}
        </Link>
      </p>
    </div>
  );
}
