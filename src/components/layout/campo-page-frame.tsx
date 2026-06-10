import { AppShell } from "@/components/layout/app-shell";

import { CampoShell } from "@/components/layout/campo-shell";

import { getUsuarioWithEquipe } from "@/lib/auth/get-usuario-with-equipe";

import {

  resolveCampoProfile,

  type CampoNavTab,

} from "@/lib/auth/usuario-campo";



type Props = {

  children: React.ReactNode;

  tab: CampoNavTab;

  /** Menos padding vertical — workspace operacional / OS */

  operational?: boolean;

};



export async function CampoPageFrame({ children, tab, operational }: Props) {

  const { usuario, equipe } = await getUsuarioWithEquipe();

  const profile = usuario ? resolveCampoProfile(usuario, equipe) : null;



  if (usuario && profile) {

    return (

      <CampoShell viewerNome={usuario.nome} profile={profile} activeTab={tab}>

        {children}

      </CampoShell>

    );

  }



  return <AppShell operational={operational}>{children}</AppShell>;

}

