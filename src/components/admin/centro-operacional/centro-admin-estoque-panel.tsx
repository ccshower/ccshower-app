"use client";

import { useCallback, useEffect, useState } from "react";

import { listarCatalogoItens } from "@/app/ordens-servico/projeto-actions";
import { CatalogoEstoqueList } from "@/components/projeto/catalogo-estoque-list";
import { CatalogoInsumoForm } from "@/components/projeto/catalogo-insumo-form";
import type { CatalogoItem } from "@/lib/types/database";

type View = "lista" | "novo";

export function CentroAdminEstoquePanel() {
  const [view, setView] = useState<View>("lista");
  const [itens, setItens] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { itens: loaded, error: loadError } = await listarCatalogoItens();
    setLoading(false);
    if (loadError) {
      setError(loadError);
      setItens([]);
      return;
    }
    setItens(loaded);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-cc-muted">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cc-blue" />
        Loading inventory…
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
        Error loading inventory: {error}
      </p>
    );
  }

  if (view === "novo") {
    return (
      <CatalogoInsumoForm
        embedded
        onBack={() => setView("lista")}
        onSaved={() => void reload()}
      />
    );
  }

  return (
    <CatalogoEstoqueList
      itens={itens}
      embedded
      onNovo={() => setView("novo")}
    />
  );
}
