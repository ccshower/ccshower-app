import { redirect } from "next/navigation";



import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";

import { resolveHomePath } from "@/lib/auth/usuario-comercial";

import { createClient } from "@/lib/supabase/server";



export default async function HomePage() {

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    redirect("/login");

  }



  const { usuario, equipe } = await getUsuarioWithEquipe();

  if (!usuario?.ativo) {

    redirect("/login?erro=inativo");

  }



  redirect(resolveHomePath(usuario, equipe));

}

