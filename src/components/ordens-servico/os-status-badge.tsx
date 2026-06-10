import {

  OS_STATUS_STYLE,

  type OrdemServicoStatus,

} from "@/lib/ordens-servico/constants";

import { tOsStatus } from "@/lib/i18n";



export function OsStatusBadge({ status }: { status: OrdemServicoStatus }) {

  const style = OS_STATUS_STYLE[status] ?? OS_STATUS_STYLE.open;

  return (

    <span

      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}

    >

      {tOsStatus(status)}

    </span>

  );

}


