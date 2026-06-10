import { redirect } from "next/navigation";

import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";

type Props = {
  params: Promise<{ id: string }>;
};

/** Alias legado → workspace operacional em /os/[id] */
export default async function OrdemServicoDetalheRedirect({ params }: Props) {
  const { id } = await params;
  redirect(osWorkspacePath(id));
}
