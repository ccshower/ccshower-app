import { revalidatePath } from "next/cache";
import { after, NextResponse } from "next/server";

import {
  loadCncUploadContext,
  uploadCncFileFromFormData,
} from "@/lib/ordens-servico/os-cnc-upload";
import { dispatchFichaTecnicaWebhook } from "@/lib/ordens-servico/os-ficha-tecnica-webhook";
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

    const loaded = await loadCncUploadContext(supabase, osId);
    if ("error" in loaded) {
      return NextResponse.json(
        { ok: false, message: loaded.error },
        { status: loaded.error.includes("nao encontrada") ? 404 : 400 },
      );
    }

    const formData = await request.formData();
    const osAmbienteIdRaw = formData.get("os_ambiente_id");
    const osAmbienteId =
      typeof osAmbienteIdRaw === "string" && osAmbienteIdRaw.trim()
        ? osAmbienteIdRaw.trim()
        : null;

    const result = await uploadCncFileFromFormData(
      supabase,
      user.id,
      loaded.os,
      formData,
      osAmbienteId,
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }

    if (result.fichaWebhookJobs.length > 0) {
      const jobs = result.fichaWebhookJobs;
      after(async () => {
        for (const job of jobs) {
          const dispatched = await dispatchFichaTecnicaWebhook(job);
          if (!dispatched.ok) {
            console.error(
              "[ficha-tecnica] webhook nao disparado para anexo",
              job.osAnexoId,
              dispatched.message,
            );
          }
        }
      });
    }

    revalidateOs(osId);
    return NextResponse.json({
      ok: true,
      id: result.id,
      count: result.count,
      ficha_webhook_queued: result.fichaWebhookJobs.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro no upload";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
