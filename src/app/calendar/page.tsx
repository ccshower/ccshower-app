import { redirect } from "next/navigation";



import { CalendarClient } from "@/app/calendar/calendar-client";

import { CampoPageFrame } from "@/components/layout/campo-page-frame";

import { getCurrentUsuario } from "@/lib/auth/get-current-usuario";

import { resolveCalendarWorkspace } from "@/lib/calendar/resolve-calendar-workspace";



export const dynamic = "force-dynamic";



type Props = {

  searchParams: Promise<{ vista?: string; dia?: string; semana?: string; mes?: string; equipe?: string }>;

};



export default async function CalendarPage({ searchParams }: Props) {

  const { usuario } = await getCurrentUsuario();

  if (!usuario?.ativo) redirect("/login");

  const params = await searchParams;

  const workspace = await resolveCalendarWorkspace(usuario, params);



  return (
    <CampoPageFrame tab="agenda">
      {workspace.error ? (
        <div className="mb-4 rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Error loading calendar: {workspace.error}
        </div>
      ) : null}
      <CalendarClient
        view={workspace.view}
        anchorDayYmd={workspace.anchorDayYmd}
        anchorMonthYmd={workspace.anchorMonthYmd}
        initialMondayYmd={workspace.initialMondayYmd}
        eventos={workspace.eventos}
        equipes={workspace.equipes}
        selectedEquipeId={workspace.selectedEquipeId}
        canFilterEquipes={workspace.canFilterEquipes}
      />
    </CampoPageFrame>
  );
}

