import type { Usuario } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/server";

export { isAdmin } from "@/lib/auth/is-admin";
export { isManager, isAdminOrManager } from "@/lib/auth/tipo-usuario";

export async function getCurrentUsuario(): Promise<{
  usuario: Usuario | null;
  authId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { usuario: null, authId: null };

  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { usuario: null, authId: user.id };
  }

  return { usuario: data as Usuario, authId: user.id };
}
