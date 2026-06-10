"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Field } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email") ?? "").trim();
        const password = String(fd.get("password") ?? "");
        startTransition(async () => {
          const supabase = createClient();
          const { error: signError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signError) {
            router.replace(`/login?erro=credenciais`);
            router.refresh();
            return;
          }
          router.replace(searchParams?.get("next") ?? "/");
          router.refresh();
        });
      }}
    >
      <Field label={t("login.email")}>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
          placeholder={t("login.emailPlaceholder")}
        />
      </Field>
      <Field label={t("login.password")}>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus"
          placeholder="••••••••"
        />
      </Field>
      {searchParams?.get("erro") === "credenciais" && !pending ? (
        <p className="text-sm font-medium text-cc-red" role="alert">
          {t("login.invalidCredentials")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center rounded-sm bg-cc-ink px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-white shadow-sheet transition hover:bg-cc-deep hover:shadow-lift disabled:pointer-events-none disabled:opacity-40"
      >
        {pending ? t("login.signingIn") : t("login.signIn")}
      </button>
    </form>
  );
}
