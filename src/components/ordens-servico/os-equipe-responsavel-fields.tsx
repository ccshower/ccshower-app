"use client";

import { useEffect, useMemo, useState } from "react";

import { Field } from "@/components/ui/field";
import {
  EQUIPE_OPERACIONAL_LABEL,
  initialResponsavelSelectValue,
  membrosDaEquipe,
  RESPONSAVEL_TODOS_EQUIPE,
} from "@/lib/ordens-servico/responsavel-equipe";
import type { Equipe, Usuario } from "@/lib/types/database";

const inputClass =
  "w-full rounded-sm border-[1.5px] border-cc-border bg-white px-3 py-2.5 text-sm font-light text-cc-ink outline-none transition placeholder:text-cc-subtle focus:border-cc-blue-focus focus:shadow-focus disabled:cursor-not-allowed disabled:bg-cc-border-light disabled:text-cc-muted";

type Props = {
  equipes: Equipe[];
  usuarios: Usuario[];
  defaultEquipeId?: string | null;
  initialEquipeId?: string | null;
  initialResponsavelId?: string | null;
  requireEquipe?: boolean;
  equipeLabel?: string;
  /** Opcional — referência auxiliar; operação é da equipe */
  responsavelLabel?: string;
  showResponsavelField?: boolean;
  onEquipeChange?: (equipeId: string) => void;
};

export function OsEquipeResponsavelFields({
  equipes,
  usuarios,
  defaultEquipeId = null,
  initialEquipeId,
  initialResponsavelId,
  requireEquipe = false,
  equipeLabel = "Operational team",
  responsavelLabel = "Reference (optional)",
  showResponsavelField = true,
  onEquipeChange,
}: Props) {
  const activeEquipes = useMemo(() => equipes.filter((e) => e.ativo), [equipes]);

  const [equipeId, setEquipeId] = useState(
    () => initialEquipeId ?? defaultEquipeId ?? "",
  );
  const [responsavelId, setResponsavelId] = useState(() =>
    initialResponsavelSelectValue(
      initialEquipeId ?? defaultEquipeId ?? null,
      usuarios,
      { responsavelId: initialResponsavelId },
    ),
  );

  const membros = useMemo(
    () => membrosDaEquipe(usuarios, equipeId || null),
    [usuarios, equipeId],
  );

  useEffect(() => {
    if (
      responsavelId !== RESPONSAVEL_TODOS_EQUIPE &&
      !membros.some((m) => m.id === responsavelId)
    ) {
      setResponsavelId(RESPONSAVEL_TODOS_EQUIPE);
    }
  }, [membros, responsavelId]);

  const handleEquipeChange = (next: string) => {
    setEquipeId(next);
    setResponsavelId(RESPONSAVEL_TODOS_EQUIPE);
    onEquipeChange?.(next);
  };

  return (
    <div className={showResponsavelField ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      <Field label={equipeLabel}>
        <select
          name="equipe_id"
          required={requireEquipe}
          value={equipeId}
          onChange={(e) => handleEquipeChange(e.target.value)}
          className={inputClass}
        >
          <option value="">{requireEquipe ? "Select a team" : "No team"}</option>
          {activeEquipes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs font-light text-cc-muted">
          The operation belongs to the team — no fixed assignee required.
        </p>
      </Field>

      {showResponsavelField ? (
        <Field label={responsavelLabel}>
          <select
            name="responsavel_id"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
            disabled={!equipeId}
            className={inputClass}
          >
            {!equipeId ? (
              <option value={RESPONSAVEL_TODOS_EQUIPE}>
                Select a team first
              </option>
            ) : (
              <>
                <option value={RESPONSAVEL_TODOS_EQUIPE}>
                  {EQUIPE_OPERACIONAL_LABEL}
                </option>
                {membros.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </>
            )}
          </select>
          {equipeId && membros.length === 0 ? (
            <p className="mt-1 text-xs font-light text-cc-muted">
              No active users on this team — use &quot;{EQUIPE_OPERACIONAL_LABEL}&quot;.
            </p>
          ) : (
            <p className="mt-1 text-xs font-light text-cc-subtle">
              Reference only; the work order remains with the team.
            </p>
          )}
        </Field>
      ) : (
        <input type="hidden" name="responsavel_id" value={RESPONSAVEL_TODOS_EQUIPE} />
      )}
    </div>
  );
}
