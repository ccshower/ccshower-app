import { redirect } from "next/navigation";

import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";
import { isAdminOrManager } from "@/lib/auth/tipo-usuario";

import { AdminChrome } from "./admin-chrome";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario } = await getCurrentUsuario();
  if (!usuario?.ativo) {
    redirect("/login");
  }
  if (!isAdminOrManager(usuario)) {
    redirect("/operacao");
  }

  return <AdminChrome>{children}</AdminChrome>;
}
