import { ContractorsClient } from "./contractors-client";
import { requireAdminOnlyPage } from "@/lib/auth/require-admin-only";
import { loadContractorsAdmin } from "@/lib/clientes/load-contractors";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminContractorsPage() {
  await requireAdminOnlyPage();
  const supabase = await createClient();
  const { contractors, error } = await loadContractorsAdmin(supabase);

  if (error) {
    return (
      <div className="rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm font-medium text-cc-red">
        Error loading contractors: {error}
      </div>
    );
  }

  return <ContractorsClient initial={contractors} />;
}
