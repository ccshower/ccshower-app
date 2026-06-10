import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { loadOsAnexoUploadContext } from "@/lib/ordens-servico/os-anexo-upload";
import { uploadInstallationPaymentReceipt } from "@/lib/ordens-servico/os-installation-upload";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/operacao");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: osId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Sessao expirada" },
        { status: 401 },
      );
    }

    const loaded = await loadOsAnexoUploadContext(supabase, osId);
    if ("error" in loaded) {
      return NextResponse.json(
        { ok: false, message: loaded.error },
        { status: loaded.error.includes("nao encontrada") ? 404 : 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Nenhum arquivo selecionado" },
        { status: 400 },
      );
    }

    const result = await uploadInstallationPaymentReceipt(
      supabase,
      user.id,
      loaded.os,
      file,
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    revalidateOs(osId);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no upload";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
