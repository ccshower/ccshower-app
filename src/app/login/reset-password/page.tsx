import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/forgot-password?erro=link-invalido");
  }

  return (
    <div className="min-h-dvh flex flex-col bg-cc-canvas">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10 sm:py-12">
        <div className="mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="CCSHOWER"
            width={220}
            height={72}
            priority
            className="h-auto w-[min(220px,70vw)] max-w-full object-contain"
          />
        </div>

        <div className="rounded-ds-lg border border-cc-border bg-cc-surface shadow-sheet">
          <div className="flex items-center justify-between border-b border-cc-border px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-cc-deep">
              {t("login.resetPasswordTitle")}
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full bg-cc-blue" aria-hidden />
          </div>
          <div className="p-4 sm:p-5">
            <ResetPasswordForm />
            <p className="mt-4 text-center">
              <Link
                href="/login"
                className="text-xs font-medium text-cc-muted underline-offset-2 hover:text-cc-deep hover:underline"
              >
                {t("login.backToSignIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
