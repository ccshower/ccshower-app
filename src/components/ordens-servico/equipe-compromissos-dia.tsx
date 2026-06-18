import type { CompromissoEquipeDia } from "@/lib/ordens-servico/agenda-equipe-dia";

type Props = {
  compromissos: CompromissoEquipeDia[];
  equipeNome?: string | null;
  loading?: boolean;
  error?: string | null;
};

export function EquipeCompromissosDia({
  compromissos,
  equipeNome,
  loading = false,
  error = null,
}: Props) {
  if (loading) {
    return (
      <p className="text-xs font-light text-cc-muted">Loading team schedule…</p>
    );
  }

  if (error) {
    return <p className="text-xs text-cc-red">{error}</p>;
  }

  if (compromissos.length === 0) {
    return (
      <p className="text-xs font-light text-cc-muted">
        No appointments{equipeNome ? ` for ${equipeNome}` : ""} on this day.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {compromissos.map((item) => (
        <li
          key={item.id}
          className="text-sm font-light text-cc-deep"
        >
          <span className="tabular-nums font-medium text-cc-ink">
            {item.horaFim ? `${item.hora} – ${item.horaFim}` : item.hora}
          </span>
          <span className="text-cc-muted"> - </span>
          {item.clienteNome}
        </li>
      ))}
    </ul>
  );
}
