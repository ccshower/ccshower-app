import Image from "next/image";
import { redirect } from "next/navigation";

import { t } from "@/lib/i18n";
import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";
import { resolveHomePath } from "@/lib/auth/usuario-comercial";
import { createClient } from "@/lib/supabase/server";

import { ForgotPasswordForm } from "./forgot-password-form";

type Props = {
  searchParams?: Promise<{ erro?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { usuario, equipe } = await getUsuarioWithEquipe();
    if (usuario?.ativo) {
      redirect(resolveHomePath(usuario, equipe));
    }
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
              {t("login.forgotPasswordTitle")}
            </span>
            <span className="h-2 w-2 shrink-0 rounded-full bg-cc-blue" aria-hidden />
          </div>
          <div className="p-4 sm:p-5">
            {sp.erro === "link-invalido" ? (
              <p
                className="mb-4 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2.5 text-sm font-medium text-cc-red"
                role="alert"
              >
                {t("login.resetLinkInvalid")}
              </p>
            ) : null}
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
