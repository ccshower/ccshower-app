import { isoRangeDiaOperacional } from "@/lib/ordens-servico/datetime";
import { hojeOperacionalYmd } from "@/lib/ordens-servico/visita-slots";

/** Início (inclusivo) e fim (exclusivo) do mês operacional atual em ISO UTC. */
export function mesOperacionalBoundsIso(): { start: string; end: string } | null {
  const hoje = hojeOperacionalYmd();
  const [y, m] = hoje.split("-").map(Number);
  if (!y || !m) return null;

  const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const firstNextMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  const startRange = isoRangeDiaOperacional(firstDay);
  const endRange = isoRangeDiaOperacional(firstNextMonth);
  if (!startRange || !endRange) return null;

  return { start: startRange.start, end: endRange.start };
}
