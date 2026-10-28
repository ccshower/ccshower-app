import { recordSmsStop } from "@/lib/clientes/sms-consent";
import { verifyN8nWebhookSecret } from "@/lib/ordens-servico/os-ficha-tecnica-webhook";
import { handleSmsStopRequest } from "@/lib/sms/sms-stop-request";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleSmsStopRequest(request, {
    n8nAuthorized: verifyN8nWebhookSecret,
    recordStop: (telefone) => recordSmsStop(createAdminClient(), telefone),
  });
}
