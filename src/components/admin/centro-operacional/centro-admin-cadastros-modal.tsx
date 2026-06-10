"use client";

import { useEffect, useRef, useState } from "react";

import { EquipesClient } from "@/app/admin/equipes/equipes-client";
import { UsuariosClient } from "@/app/admin/usuarios/usuarios-client";
import { CentroAdminEstoquePanel } from "@/components/admin/centro-operacional/centro-admin-estoque-panel";
import { CentroAdminFinanceiroPanel } from "@/components/admin/centro-operacional/centro-admin-financeiro-panel";
import { createClient } from "@/lib/supabase/client";
import type {
  Equipe,
  Unidade,
  Usuario,
  UsuarioWithEquipe,
} from "@/lib/types/database";

export type CadastroTipo = "usuarios" | "equipes" | "estoque" | "financeiro";

const TITULO: Record<CadastroTipo, string> = {
  usuarios: "Users",
  equipes: "Teams",
  estoque: "Inventory",
  financeiro: "Financial",
};

type CadastrosData = {
  usuarios: UsuarioWithEquipe[];
  equipes: Equipe[];
  unidades: Unidade[];
};

function mergeUsuarios(
  usuarios: Usuario[],
  equipes: Equipe[],
  unidades: Unidade[],
): UsuarioWithEquipe[] {
  const mapEq = new Map(equipes.map((e) => [e.id, e]));
  const mapUn = new Map(unidades.map((u) => [u.id, u]));
  return usuarios.map((row) => {
    const eq = row.equipe_id ? mapEq.get(row.equipe_id) : undefined;
    const un = row.unidade_id ? mapUn.get(row.unidade_id) : undefined;
    return {
      ...row,
      equipe: eq
        ? {
            id: eq.id,
            nome: eq.nome,
            cor_primaria: eq.cor_primaria,
            cor_secundaria: eq.cor_secundaria,
          }
        : null,
      unidade: un ? { id: un.id, nome: un.nome, matriz: un.matriz } : null,
    };
  });
}

export function CentroAdminCadastrosModal({
  tipo,
  unidadeId = null,
  onClose,
}: {
  tipo: CadastroTipo | null;
  unidadeId?: string | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<CadastrosData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = tipo !== null;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (!tipo || tipo === "estoque" || tipo === "financeiro") return;

    let cancelled = false;
    setData(null);
    setError(null);

    const supabase = createClient();
    void (async () => {
      const [usuariosRes, equipesRes, unidadesRes] = await Promise.all([
        supabase.from("usuarios").select("*").order("nome", { ascending: true }),
        supabase.from("equipes").select("*").order("nome", { ascending: true }),
        supabase
          .from("unidades")
          .select("id, nome, timezone, matriz, ativo, criado_em")
          .eq("ativo", true)
          .order("matriz", { ascending: false })
          .order("nome", { ascending: true }),
      ]);

      if (cancelled) return;

      const err =
        usuariosRes.error?.message ??
        equipesRes.error?.message ??
        unidadesRes.error?.message ??
        null;
      if (err) {
        setError(err);
        return;
      }

      const equipes = (equipesRes.data ?? []) as Equipe[];
      const unidades = (unidadesRes.data ?? []) as Unidade[];
      const usuarios = mergeUsuarios(
        (usuariosRes.data ?? []) as Usuario[],
        equipes,
        unidades,
      );

      setData({ usuarios, equipes, unidades });
    })();

    return () => {
      cancelled = true;
    };
  }, [tipo]);

  return (
    <dialog
      ref={ref}
      className="w-[calc(100%-1.5rem)] max-w-5xl rounded-ds-lg border border-cc-border bg-cc-surface p-0 text-base font-light shadow-lift backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-none"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-cc-border px-5 py-3.5">
        <h2 className="font-display text-lg font-light tracking-tight text-cc-ink">
          {tipo ? TITULO[tipo] : ""}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-ds p-1.5 text-cc-muted transition-colors hover:bg-cc-canvas hover:text-cc-ink"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="max-h-[78vh] overflow-y-auto px-5 py-4">
        {tipo === "estoque" ? (
          <CentroAdminEstoquePanel />
        ) : tipo === "financeiro" ? (
          <CentroAdminFinanceiroPanel unidadeId={unidadeId} />
        ) : error ? (
          <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
            Error loading data: {error}
          </p>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-cc-muted">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cc-blue" />
            Loading…
          </div>
        ) : tipo === "usuarios" ? (
          <UsuariosClient
            initial={data.usuarios}
            equipes={data.equipes}
            unidades={data.unidades}
            embedded
          />
        ) : (
          <EquipesClient
            initial={
              unidadeId
                ? data.equipes.filter((equipe) => equipe.unidade_id === unidadeId)
                : data.equipes
            }
            unidades={data.unidades}
            usuarios={data.usuarios}
            embedded
          />
        )}
      </div>
    </dialog>
  );
}
