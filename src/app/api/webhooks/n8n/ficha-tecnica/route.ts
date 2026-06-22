import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  parseAndImportFichaTecnicaFromN8n,
  verifyN8nWebhookSecret,
} from "@/lib/ordens-servico/os-ficha-tecnica-webhook";

export const runtime = "nodejs";
export const maxDuration = 60;

function revalidateOs(osId: string) {
  revalidatePath("/ordens-servico");
  revalidatePath("/operacao");
  revalidatePath("/os", "layout");
  revalidatePath(`/os/${osId}`);
}

export async function POST(request: Request) {
  if (!verifyN8nWebhookSecret(request)) {
    return NextResponse.json(
      { ok: false, message: "Nao autorizado" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const result = await parseAndImportFichaTecnicaFromN8n(body);

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    const osAnexoId =
      body && typeof body === "object" && "os_anexo_id" in body
        ? String((body as { os_anexo_id: unknown }).os_anexo_id)
        : null;

    if (osAnexoId) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();
      const { data: anexo } = await supabase
        .from("os_anexos")
        .select("ordem_servico_id")
        .eq("id", osAnexoId)
        .maybeSingle();
      if (anexo?.ordem_servico_id) {
        revalidateOs(anexo.ordem_servico_id as string);
      }
    }

    return NextResponse.json({
      ok: true,
      item_count: result.item_count,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao importar ficha tecnica";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
