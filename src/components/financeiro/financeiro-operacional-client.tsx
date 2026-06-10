"use client";

import { useRouter } from "next/navigation";

import {
  CentroIcon,
  IconChevronRight,
} from "@/components/admin/centro-operacional/centro-operacional-icons";
import {
  CLIENTE_EM_ABERTO_STATUS_UI,
  formatFinanceiroValor,
  type FinanceiroOperacionalData,
} from "@/lib/financeiro-operacional/financeiro-operacional";
import { osWorkspacePath } from "@/lib/ordens-servico/os-routes";

type Props = {
  data: FinanceiroOperacionalData;
  /** Dentro do modal admin — oculta título duplicado. */
  embedded?: boolean;
};

export function FinanceiroOperacionalClient({ data, embedded = false }: Props) {
  const router = useRouter();

  return (
    <div
      className={
        embedded ? "w-full" : "mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-5"
      }
    >
      {!embedded ? (
        <header className="mb-4 sm:mb-5">
          <h1 className="text-lg font-semibold text-cc-ink sm:text-xl">Operational Financial</h1>
          <p className="mt-1 text-sm text-cc-muted">
            Operational visibility — approvals, billing, and outstanding balances.
          </p>
        </header>
      ) : null}

      {data.error ? (
        <div className="mb-4 rounded-sm border border-cc-red-soft bg-cc-red-soft p-4 text-sm text-cc-red">
          Could not load financial workspace: {data.error}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <AguardandoAprovacaoCard aguardando={data.aguardando} />
        <MetricCard
          title="Billed This Month"
          value={formatFinanceiroValor(data.faturadoNoMes)}
          hint="OS completed in the operational period"
          icon="dollar"
          accent="text-emerald-700"
        />
        <MetricCard
          title="Received This Month"
          value={formatFinanceiroValor(data.recebidoNoMes)}
          hint="Provisional indicator (confirmed payments)"
          icon="clock"
          accent="text-teal-700"
          provisional
        />
      </section>

      <ClientesEmAbertoSection
        items={data.clientesEmAberto}
        onOpenOs={(osId) => router.push(osWorkspacePath(osId))}
      />
    </div>
  );
}

function AguardandoAprovacaoCard({
  aguardando,
}: {
  aguardando: FinanceiroOperacionalData["aguardando"];
}) {
  return (
    <article className="rounded-ds-xl border border-cc-border bg-cc-surface p-4 shadow-sheet sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            Awaiting Approval
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-cc-ink">
            {aguardando.aguardandoAprovacao}
          </p>
          <p className="mt-1 text-xs text-cc-muted">OS in financial stage</p>
        </div>
        <CentroIcon id="clipboard" className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>
      <dl className="mt-4 space-y-2 border-t border-cc-border pt-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-cc-muted">Pending financing</dt>
          <dd className="font-semibold tabular-nums text-cc-ink">
            {aguardando.financiamentosPendentes}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-cc-muted">Rejected</dt>
          <dd className="font-semibold tabular-nums text-red-700">{aguardando.reprovados}</dd>
        </div>
      </dl>
    </article>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  accent,
  provisional = false,
}: {
  title: string;
  value: string;
  hint: string;
  icon: "dollar" | "clock";
  accent: string;
  provisional?: boolean;
}) {
  return (
    <article className="rounded-ds-xl border border-cc-border bg-cc-surface p-4 shadow-sheet sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            {title}
          </p>
          <p className={`mt-2 truncate text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
          <p className="mt-1 text-xs text-cc-muted">{hint}</p>
          {provisional ? (
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-amber-700">
              Provisional — future Bill integration
            </p>
          ) : null}
        </div>
        <CentroIcon id={icon} className={`h-5 w-5 shrink-0 ${accent}`} />
      </div>
    </article>
  );
}

function ClientesEmAbertoSection({
  items,
  onOpenOs,
}: {
  items: FinanceiroOperacionalData["clientesEmAberto"];
  onOpenOs: (osId: string) => void;
}) {
  return (
    <section className="mt-4 sm:mt-5">
      <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            <CentroIcon id="users" className="h-3.5 w-3.5 text-emerald-600" />
            Open Clients
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {items.length} OS
          </span>
        </div>

        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-cc-muted sm:px-5">
            No clients with an outstanding balance at the moment.
          </p>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto] gap-3 border-b border-cc-border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-muted sm:grid sm:px-5">
              <span>Client</span>
              <span className="text-right">Total Amount</span>
              <span className="text-right">Received</span>
              <span className="text-right">Balance</span>
              <span className="w-24 text-right">Status</span>
            </div>
            <ul>
              {items.map((item, index) => {
                const statusUi = CLIENTE_EM_ABERTO_STATUS_UI[item.status];
                const last = index === items.length - 1;

                return (
                  <li key={item.osId} className={last ? "" : "border-b border-cc-border"}>
                    <button
                      type="button"
                      onClick={() => onOpenOs(item.osId)}
                      className="group flex w-full cursor-pointer flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-cc-canvas/80 sm:grid sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto] sm:items-center sm:gap-3 sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-cc-ink">
                          {item.clienteNome}
                        </div>
                        {item.osTitulo ? (
                          <div className="mt-0.5 truncate text-xs text-cc-muted">{item.osTitulo}</div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                          <MoneyPill label="Total" value={formatFinanceiroValor(item.valorTotal)} />
                          <MoneyPill label="Received" value={formatFinanceiroValor(item.recebido)} />
                          <MoneyPill
                            label="Balance"
                            value={formatFinanceiroValor(item.saldo)}
                            emphasis
                          />
                        </div>
                      </div>

                      <span className="hidden text-right text-sm tabular-nums text-cc-ink sm:block">
                        {formatFinanceiroValor(item.valorTotal)}
                      </span>
                      <span className="hidden text-right text-sm tabular-nums text-cc-muted sm:block">
                        {formatFinanceiroValor(item.recebido)}
                      </span>
                      <span className="hidden text-right text-sm font-semibold tabular-nums text-cc-ink sm:block">
                        {formatFinanceiroValor(item.saldo)}
                      </span>

                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusUi.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusUi.dot}`}
                            aria-hidden
                          />
                          {statusUi.label}
                        </span>
                        <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function MoneyPill({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-ds border border-cc-border bg-cc-canvas px-2 py-0.5 text-[10px]">
      <span className="font-medium uppercase tracking-wide text-cc-muted">{label}</span>
      <span className={`tabular-nums ${emphasis ? "font-semibold text-cc-ink" : "text-cc-muted"}`}>
        {value}
      </span>
    </span>
  );
}
