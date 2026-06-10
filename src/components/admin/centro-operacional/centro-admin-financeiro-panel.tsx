"use client";

import { useCallback, useEffect, useState } from "react";

import { loadFinanceiroOperacionalAction } from "@/app/financeiro/actions";
import { FinanceiroOperacionalClient } from "@/components/financeiro/financeiro-operacional-client";
import type { FinanceiroOperacionalData } from "@/lib/financeiro-operacional/financeiro-operacional";

type Props = {
  unidadeId?: string | null;
};

export function CentroAdminFinanceiroPanel({ unidadeId = null }: Props) {
  const [data, setData] = useState<FinanceiroOperacionalData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const result = await loadFinanceiroOperacionalAction(unidadeId);
    setData(result);
    setLoading(false);
  }, [unidadeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-cc-muted">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Loading financial…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
        Error loading operational financial.
      </p>
    );
  }

  return <FinanceiroOperacionalClient data={data} embedded />;
}
