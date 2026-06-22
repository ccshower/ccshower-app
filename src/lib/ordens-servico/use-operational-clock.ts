"use client";

import { useEffect, useState } from "react";

import { hojeOperacionalYmd, horaOperacionalAgora } from "@/lib/ordens-servico/visita-slots";

export type OperationalClock = {
  ymd: string;
  hm: string;
};

function readOperationalClock(): OperationalClock {
  return { ymd: hojeOperacionalYmd(), hm: horaOperacionalAgora() };
}

/** Hora/data operacionais com atualização periódica (client-only após mount). */
export function useOperationalClock(active = true, tickMs = 30_000): OperationalClock {
  const [clock, setClock] = useState<OperationalClock>(readOperationalClock);

  useEffect(() => {
    setClock(readOperationalClock());
    if (!active) return;
    const id = window.setInterval(() => setClock(readOperationalClock()), tickMs);
    return () => window.clearInterval(id);
  }, [active, tickMs]);

  return clock;
}
