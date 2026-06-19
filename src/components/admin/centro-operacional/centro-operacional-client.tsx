"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CentroRepairModal } from "@/components/admin/centro-operacional/centro-repair-modal";
import { CentroAdminMenu } from "@/components/admin/centro-operacional/centro-admin-menu";
import {
  CentroAdminCadastrosModal,
  type CadastroTipo,
} from "@/components/admin/centro-operacional/centro-admin-cadastros-modal";
import type { CentroAdminMenuItem } from "@/components/admin/centro-operacional/centro-admin-menu";
import { CentroCalendarModal } from "@/components/admin/centro-operacional/centro-calendar-modal";
import { CentroUnidadeSelect } from "@/components/admin/centro-operacional/centro-unidade-select";
import {
  AgendaGlobalResumo,
  AgendaRow,
  AgendaTabSwitch,
} from "@/components/admin/centro-operacional/centro-agenda-ui";
import { ClienteForm } from "@/app/admin/clientes/clientes-client";
import { criarCliente } from "@/app/admin/clientes/actions";
import { OperationalModal } from "@/components/operacional/operational-modal";
import {
  CentroIcon,
  IconActivity,
  IconArrowUpRight,
  IconCalendar,
  IconChevronRight,
  IconLock,
  IconPlus,
  IconTrendDown,
} from "@/components/admin/centro-operacional/centro-operacional-icons";
import {
  getProducaoMensalPercentual,
  formatProducaoValor,
  type ProducaoMensalData,
} from "@/lib/centro-operacional/producao-mensal";
import {
  bloqueioCategorias,
  bloqueioCategoriaColors,
  type Priority,
  type AttentionType,
  type BloqueioCategoria,
  type PulseMetric,
} from "@/lib/mock/centro-operacional/operational-dashboard";
import {
  capacidadeStatusConfig,
  type CapacidadeOperacionalData,
  type EquipeCapacidade,
} from "@/lib/centro-operacional/capacidade-operacional";
import type { GargalosOperacionaisData } from "@/lib/centro-operacional/gargalos-operacionais";
import type { AgendaGlobalData } from "@/lib/centro-operacional/agenda-global";
import type {
  SaudeOperacionalCard,
  SaudeOperacionalData,
} from "@/lib/centro-operacional/saude-operacional";
import type { AtencaoAgoraData, AtencaoAgoraItem } from "@/lib/centro-operacional/atencao-agora";
import type {
  BloqueioOperacionalItem,
  BloqueiosOperacionaisData,
} from "@/lib/centro-operacional/bloqueios-operacionais";
import { formatCentroHeaderDate } from "@/lib/centro-operacional/centro-header-date";
import {
  filaComercialStatusConfig,
  formatDataCadastro,
  type FilaComercialItem,
} from "@/lib/centro-operacional/fila-comercial";
import {
  filaFinanceiroDecisionConfig,
  filaFinanceiroStatusBadge,
  type FilaFinanceiroItem,
} from "@/lib/centro-operacional/fila-financeiro";
import {
  filaInstalacaoStatusBadge,
  type FilaInstalacaoItem,
} from "@/lib/centro-operacional/fila-instalacao";
import type { FilaRepairItem } from "@/lib/centro-operacional/fila-repair";
import {
  filaProjetoStatusBadge,
  type FilaProjetoItem,
} from "@/lib/centro-operacional/fila-projeto";
import { formatFinanceiroValor } from "@/lib/financeiro-operacional/financeiro-operacional";
import { osWorkspacePathWithUnidade } from "@/lib/unidades/centro-unidade-persist";
import { t } from "@/lib/i18n";
import type { Equipe, Unidade, Usuario } from "@/lib/types/database";

type CentroOperacionalClientProps = {
  filaComercial: FilaComercialItem[];
  filaComercialError: string | null;
  filaFinanceiro: FilaFinanceiroItem[];
  filaFinanceiroError: string | null;
  filaProjeto: FilaProjetoItem[];
  filaProjetoError: string | null;
  filaInstalacao: FilaInstalacaoItem[];
  filaInstalacaoError: string | null;
  filaRepair: FilaRepairItem[];
  filaRepairError: string | null;
  podeAbrirRepair: boolean;
  agendaGlobal: AgendaGlobalData;
  saudeOperacional: SaudeOperacionalData;
  atencaoAgora: AtencaoAgoraData;
  bloqueiosOperacionais: BloqueiosOperacionaisData;
  producaoMensal: ProducaoMensalData;
  gargalosOperacionais: GargalosOperacionaisData;
  capacidadeOperacional: CapacidadeOperacionalData;
  equipes: Equipe[];
  usuarios: Usuario[];
  googleMapsApiKey: string;
  defaultEquipeId: string | null;
  canChooseEquipe: boolean;
  viewerNome: string;
  isAdmin: boolean;
  canSelectUnidade: boolean;
  unidades: Unidade[];
  unidadeSelecionadaId: string | null;
};

export function CentroOperacionalClient({
  filaComercial,
  filaComercialError,
  filaFinanceiro,
  filaFinanceiroError,
  filaProjeto,
  filaProjetoError,
  filaInstalacao,
  filaInstalacaoError,
  filaRepair,
  filaRepairError,
  podeAbrirRepair,
  agendaGlobal,
  saudeOperacional,
  atencaoAgora,
  bloqueiosOperacionais,
  producaoMensal,
  gargalosOperacionais,
  capacidadeOperacional,
  equipes,
  usuarios,
  googleMapsApiKey,
  defaultEquipeId,
  canChooseEquipe,
  viewerNome,
  isAdmin,
  canSelectUnidade,
  unidades,
  unidadeSelecionadaId,
}: CentroOperacionalClientProps) {
  const router = useRouter();
  const [attentionFilter, setAttentionFilter] = useState<AttentionType | "todos">("todos");
  const [bloqueioFilter, setBloqueioFilter] = useState<BloqueioCategoria | "todos">("todos");
  const [agendaTab, setAgendaTab] = useState<"hoje" | "amanha" | "semana">("hoje");
  const [repairModalOpen, setRepairModalOpen] = useState(false);

  const filteredAttention =
    attentionFilter === "todos"
      ? atencaoAgora.items
      : atencaoAgora.items.filter((i) => i.type === attentionFilter);

  const filteredBloqueios =
    bloqueioFilter === "todos"
      ? bloqueiosOperacionais.items
      : bloqueiosOperacionais.items.filter(
          (b) => b.filterCategoria === bloqueioFilter,
        );

  const bloqueioFilters =
    bloqueiosOperacionais.filters.length > 0
      ? bloqueiosOperacionais.filters
      : bloqueioCategorias.map((f) => ({ ...f, count: 0 }));

  const agendaDia =
    agendaTab === "hoje"
      ? agendaGlobal.hoje
      : agendaTab === "amanha"
        ? agendaGlobal.amanha
        : {
            ymd: agendaGlobal.semana.inicioYmd,
            eventos: agendaGlobal.semana.eventos,
            contadores: agendaGlobal.semana.contadores,
          };
  const agendaEvents = agendaDia.eventos;
  const agendaEmptyMessage =
    agendaTab === "hoje"
      ? "No events scheduled for today"
      : agendaTab === "amanha"
        ? "No events scheduled for tomorrow"
        : "No field events scheduled this week";

  const pulseMetrics = buildPulseMetrics({
    bloqueiosOperacionais,
    atencaoAgora,
    agendaGlobal,
    saudeOperacional,
  });

  return (
    <div className="min-h-dvh bg-cc-canvas">
      <CentroHeader
        viewerNome={viewerNome}
        isAdmin={isAdmin}
        canSelectUnidade={canSelectUnidade}
        unidades={unidades}
        unidadeSelecionadaId={unidadeSelecionadaId}
      />

      <div className="px-3 pb-16 pt-5">
        <section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {pulseMetrics.map((m) => (
              <PulseCard key={m.label} {...m} />
            ))}
          </div>
          <div className="mt-2 rounded-ds-xl border border-cc-border bg-cc-surface px-4 py-3 shadow-sheet sm:mt-2.5 sm:px-5 sm:py-3.5">
            <ProducaoMesCard producaoMensal={producaoMensal} embedded />
            <CapacidadeOperacionalCard capacidade={capacidadeOperacional} embedded />
          </div>
        </section>

        <FilaComercialSection
          fila={filaComercial}
          loadError={filaComercialError}
          equipes={equipes}
          usuarios={usuarios}
          googleMapsApiKey={googleMapsApiKey}
          defaultEquipeId={defaultEquipeId}
          canChooseEquipe={canChooseEquipe}
          unidadeId={unidadeSelecionadaId}
        />

        <FilaFinanceiroSection
          fila={filaFinanceiro}
          loadError={filaFinanceiroError}
          unidadeId={unidadeSelecionadaId}
        />

        <FilaProjetoSection
          fila={filaProjeto}
          loadError={filaProjetoError}
          unidadeId={unidadeSelecionadaId}
        />

        <FilaInstalacaoSection
          fila={filaInstalacao}
          loadError={filaInstalacaoError}
          unidadeId={unidadeSelecionadaId}
        />

        <FilaRepairSection
          fila={filaRepair}
          loadError={filaRepairError}
          unidadeId={unidadeSelecionadaId}
          podeAbrirRepair={podeAbrirRepair}
          onAddRepair={() => setRepairModalOpen(true)}
        />

        <section className="mt-10">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionLabel critical>Attention Now</SectionLabel>
              <h2 className="mt-1 font-display text-3xl font-light tracking-tight text-cc-ink sm:text-4xl">
                What needs attention <em className="italic text-cc-rose">now</em>
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-cc-muted">
                Active blocks, overdue OS, critical pending items, and operational bottlenecks.
              </p>
            </div>
            <FilterPills
              items={atencaoAgora.filters}
              active={attentionFilter}
              onChange={(id) => setAttentionFilter(id as AttentionType | "todos")}
            />
          </div>

          {atencaoAgora.error ? (
            <p className="mb-3 text-sm text-cc-red">
              Could not load operational attention: {atencaoAgora.error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
            {atencaoAgora.totalCount === 0 ? (
              <EmptyState message="✅ No critical items at the moment" />
            ) : filteredAttention.length === 0 ? (
              <EmptyState message="No items in this category." />
            ) : (
              <div
                className="max-h-[min(280px,42vh)] overflow-y-auto overscroll-y-contain sm:max-h-[min(360px,48vh)] lg:max-h-[400px]"
                aria-label="Items requiring attention"
              >
                {filteredAttention.map((item, i) => (
                  <AttentionRow
                    key={item.id}
                    {...item}
                    last={i === filteredAttention.length - 1}
                    onOpen={() => router.push(item.href)}
                  />
                ))}
              </div>
            )}
          </div>

          {gargalosOperacionais.error ? (
            <p className="mt-4 text-sm text-cc-red">
              Could not load bottlenecks: {gargalosOperacionais.error}
            </p>
          ) : gargalosOperacionais.items.length === 0 ? (
            <div className="mt-4 rounded-ds-lg border border-cc-border bg-cc-surface px-4 py-3 text-sm text-cc-muted shadow-sheet">
              ✅ No operational bottleneck identified
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {gargalosOperacionais.items.map((g) => (
                <div
                  key={g.id}
                  className="flex items-start gap-3 rounded-ds-lg border border-cc-border bg-cc-surface px-4 py-3 shadow-sheet"
                >
                  <IconTrendDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Bottleneck · {g.etapa}
                    </div>
                    <p className="mt-0.5 text-sm leading-snug text-cc-deep">{g.descricao}</p>
                    <p className="mt-1 text-xs text-cc-muted">{g.impacto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionLabel>Global Schedule</SectionLabel>
            <div className="mb-5 mt-1 flex items-end justify-between gap-4">
              <h2 className="font-display text-3xl font-light tracking-tight text-cc-ink">
                Visits · Measurements · Installations
              </h2>
              <AgendaTabSwitch
                tabs={[
                  { id: "hoje", label: "Today", count: agendaGlobal.hoje.eventos.length },
                  { id: "amanha", label: "Tomorrow", count: agendaGlobal.amanha.eventos.length },
                  {
                    id: "semana",
                    label: "This week",
                    count: agendaGlobal.semana.eventos.length,
                  },
                ]}
                active={agendaTab}
                onChange={(id) => setAgendaTab(id as "hoje" | "amanha" | "semana")}
              />
            </div>
            {agendaGlobal.error ? (
              <p className="mb-3 text-sm text-cc-red">
                Could not load schedule: {agendaGlobal.error}
              </p>
            ) : null}
            <div
              className="max-h-[min(280px,42vh)] overflow-y-auto overscroll-y-contain rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet sm:max-h-[min(360px,48vh)] lg:max-h-[500px]"
              aria-label="Day event list"
            >
              {agendaEvents.length === 0 ? (
                <EmptyState message={agendaEmptyMessage} />
              ) : (
                agendaEvents.map((e, i) => (
                  <AgendaRow
                    key={e.id}
                    {...e}
                    unidadeId={unidadeSelecionadaId}
                    last={i === agendaEvents.length - 1}
                  />
                ))
              )}
            </div>
            <div className="mt-3">
              <AgendaGlobalResumo contadores={agendaDia.contadores} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <SectionLabel>Operational Health</SectionLabel>
            <h2 className="mb-5 mt-1 font-display text-3xl font-light tracking-tight text-cc-ink">
              Flow status
            </h2>
            {saudeOperacional.error ? (
              <p className="mb-3 text-sm text-cc-red">
                Could not load operational health: {saudeOperacional.error}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {saudeOperacional.cards.map((s) => (
                <SaudeCard key={s.label} {...s} />
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionLabel critical>Operational Blocks</SectionLabel>
              <h2 className="mt-1 font-display text-3xl font-light tracking-tight text-cc-ink">
                Active Blocks
              </h2>
              <p className="mt-1.5 text-sm text-cc-muted">
                Blocks prevent the OS from advancing at any stage of the flow.
              </p>
            </div>
            <FilterPills
              items={bloqueioFilters}
              active={bloqueioFilter}
              onChange={(id) => setBloqueioFilter(id as BloqueioCategoria | "todos")}
            />
          </div>

          {bloqueiosOperacionais.error ? (
            <p className="mb-3 text-sm text-cc-red">
              Could not load operational blocks:{" "}
              {bloqueiosOperacionais.error}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
            <div className="hidden shrink-0 border-b border-cc-border bg-cc-border-light px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-muted sm:px-5 md:grid md:grid-cols-[1.2fr_0.7fr_0.8fr_0.9fr_2fr_0.9fr_0.7fr] md:gap-3">
              <span>Client</span>
              <span>OS</span>
              <span>Stage</span>
              <span>Category</span>
              <span>Reason</span>
              <span>Opened</span>
              <span>Resp.</span>
            </div>
            {bloqueiosOperacionais.totalCount === 0 ? (
              <EmptyState message="✅ No active operational blocks" />
            ) : filteredBloqueios.length === 0 ? (
              <EmptyState message="No blocks in this category." />
            ) : (
              <div
                className="max-h-[min(240px,38vh)] overflow-y-auto overscroll-y-contain sm:max-h-[min(320px,44vh)] lg:max-h-[360px]"
                aria-label="Active operational blocks"
              >
                {filteredBloqueios.map((b, i) => (
                  <BloqueioRow
                    key={b.id}
                    {...b}
                    last={i === filteredBloqueios.length - 1}
                    onOpen={() => router.push(b.href)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <CentroRepairModal
        open={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        unidadeId={unidadeSelecionadaId}
      />
    </div>
  );
}

function CentroHeader({
  viewerNome,
  isAdmin,
  canSelectUnidade,
  unidades,
  unidadeSelecionadaId,
}: {
  viewerNome: string;
  isAdmin: boolean;
  canSelectUnidade: boolean;
  unidades: Unidade[];
  unidadeSelecionadaId: string | null;
}) {
  const headerDate = formatCentroHeaderDate();
  const unidadeAtual = unidades.find((u) => u.id === unidadeSelecionadaId) ?? null;
  const [cadastroModal, setCadastroModal] = useState<CadastroTipo | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  function openCadastroModal(item: CentroAdminMenuItem) {
    if (item.href === "/admin/equipes") {
      if (!unidadeSelecionadaId) return;
      setCadastroModal("equipes");
      return;
    }
    if (item.href === "/admin/unidades") {
      setCadastroModal("unidades");
      return;
    }
    if (item.href === "/admin/estoque") {
      setCadastroModal("estoque");
      return;
    }
    if (item.href === "/admin/financeiro") {
      setCadastroModal("financeiro");
      return;
    }
    setCadastroModal("usuarios");
  }

  return (
    <header className="relative bg-cc-ink text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute -right-20 -top-20 h-[280px] w-[280px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,144,138,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 h-[240px] w-[240px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(113,137,168,0.15) 0%, transparent 70%)",
            }}
          />
        </div>
        <div className="relative z-10 overflow-visible px-3 py-4 sm:px-4">
          <div className="flex items-center gap-4">
            <div className="flex min-w-0 shrink-0 items-center gap-4">
              <div className="rounded-ds bg-white px-2.5 py-1.5 shadow-sheet">
                <Image
                  src="/logo.png"
                  alt="CC Shower Door"
                  width={96}
                  height={28}
                  className="h-6 w-auto"
                />
              </div>
              <div className="hidden h-9 w-px bg-white/10 sm:block" />
              <h1 className="font-display text-2xl font-light leading-tight tracking-tight sm:text-[2rem]">
                Operational <em className="italic text-cc-rose">Center</em>
              </h1>
            </div>

            <div
              className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex"
              aria-hidden
            >
              <IconActivity className="h-[1.35rem] w-[1.35rem] text-cc-rose/30" />
            </div>

            <div className="relative z-20 ml-auto flex flex-wrap items-center justify-end gap-4 sm:gap-6">
              {canSelectUnidade && unidades.length > 0 ? (
                <CentroUnidadeSelect
                  unidades={unidades}
                  selectedId={unidadeSelecionadaId}
                />
              ) : unidadeAtual ? (
                <span className="rounded-ds border border-white/10 px-2.5 py-1.5 text-sm font-medium text-white">
                  {unidadeAtual.nome}
                </span>
              ) : null}

              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                disabled={!unidadeAtual}
                aria-label={
                  unidadeAtual
                    ? "Open calendar"
                    : "Select a unit to open the calendar"
                }
                title={
                  unidadeAtual
                    ? undefined
                    : "Select a unit to open the calendar"
                }
                className={`group flex items-center gap-2 rounded-ds border border-white/10 px-2.5 py-1.5 transition-all duration-200 ${
                  unidadeAtual
                    ? "cursor-pointer hover:border-white/25 hover:bg-white/10 active:scale-[0.98]"
                    : "cursor-not-allowed opacity-45"
                }`}
              >
                <IconCalendar
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    unidadeAtual
                      ? "text-cc-rose/90 group-hover:text-cc-rose"
                      : "text-cc-rose/50"
                  }`}
                />
                <span className="text-sm font-medium tabular-nums text-white">
                  {headerDate}
                </span>
              </button>

              <div className="text-right">
                <strong className="block max-w-[10rem] truncate text-sm font-medium text-white sm:max-w-[12rem]">
                  {viewerNome}
                </strong>
                {isAdmin ? (
                  <CentroAdminMenu
                    onSelect={openCadastroModal}
                    isItemDisabled={(item) =>
                      item.href === "/admin/equipes" && !unidadeSelecionadaId
                    }
                    disabledItemHint={(item) =>
                      item.href === "/admin/equipes" && !unidadeSelecionadaId
                        ? "Select a unit to manage teams"
                        : null
                    }
                  />
                ) : (
                  <span className="text-xs text-cc-subtle">
                    {canSelectUnidade ? "Manager" : "Operator"}
                  </span>
                )}
              </div>

              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-sm border border-white/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                >
                  {t("common.signOut")}
                </button>
              </form>
            </div>
          </div>
        </div>

        <CentroAdminCadastrosModal
          tipo={cadastroModal}
          unidadeId={unidadeSelecionadaId}
          onClose={() => setCadastroModal(null)}
        />

        <CentroCalendarModal
          open={calendarOpen && Boolean(unidadeAtual)}
          onClose={() => setCalendarOpen(false)}
          unidadeId={unidadeAtual?.id ?? null}
          unidadeNome={unidadeAtual?.nome ?? null}
        />
      </header>
  );
}

function SectionLabel({ children, critical }: { children: React.ReactNode; critical?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
          critical ? "text-cc-rose-deep" : "text-cc-rose"
        }`}
      >
        {children}
      </span>
      <span className="h-px w-12 bg-cc-border" />
    </div>
  );
}

function FilterPills<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { id: T; label: string; count: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`inline-flex items-center gap-1.5 rounded-ds px-3 py-1.5 text-xs font-medium transition-all ${
            active === item.id
              ? "bg-cc-ink text-white shadow-sheet"
              : "border border-cc-border bg-cc-surface text-cc-deep hover:border-cc-border-strong"
          }`}
        >
          {item.label}
          <span className={`text-[10px] tabular-nums ${active === item.id ? "text-cc-subtle" : "text-cc-muted"}`}>
            {item.count}
          </span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-6 py-12 text-center text-sm text-cc-muted">{message}</div>;
}

function buildPulseMetrics({
  bloqueiosOperacionais,
  atencaoAgora,
  agendaGlobal,
  saudeOperacional,
}: {
  bloqueiosOperacionais: BloqueiosOperacionaisData;
  atencaoAgora: AtencaoAgoraData;
  agendaGlobal: AgendaGlobalData;
  saudeOperacional: SaudeOperacionalData;
}): PulseMetric[] {
  const osEmAndamento =
    saudeOperacional.cards.find((card) => card.label === "OS In Progress")?.value ?? 0;

  return [
    {
      label: "Active Blocks",
      value: bloqueiosOperacionais.totalCount,
      hint: "OS blocked in flow",
      icon: "alert",
      critical: true,
    },
    {
      label: "Overdue OS",
      value: atencaoAgora.items.filter((item) => item.type === "atrasada").length,
      hint: "awaiting action",
      icon: "clock",
      warn: true,
    },
    {
      label: "Appointments Today",
      value: agendaGlobal.hoje.eventos.length,
      hint: "",
      tooltipLines: ["visits", "measurements", "installations"],
      icon: "users",
    },
    {
      label: "Orders In Progress",
      value: osEmAndamento,
      hint: "in operational flow",
      icon: "clipboard",
    },
  ];
}

function PulseCard({
  label,
  value,
  hint,
  icon,
  critical,
  warn,
  tooltipLines,
}: PulseMetric) {
  const isAlert = critical && value > 0;
  const isWarn = warn && value > 0;
  const hasTooltip = Boolean(tooltipLines?.length);

  return (
    <button
      type="button"
      className={`group relative rounded-ds-xl border p-3 text-left transition-all duration-300 hover:-translate-y-0.5 sm:p-3.5 ${
        isAlert
          ? "border-cc-rose-deep bg-cc-rose-deep text-white shadow-[0_8px_32px_rgba(212,144,138,0.25)]"
          : isWarn
            ? "border-cc-ink bg-cc-ink text-white shadow-sheet"
            : "border-cc-border bg-cc-surface shadow-sheet hover:shadow-lift"
      }`}
    >
      <div className="mb-2.5 flex items-start justify-between">
        <CentroIcon
          id={icon}
          className={`h-4 w-4 ${isAlert || isWarn ? "text-white/90" : "text-cc-blue"}`}
        />
        <IconArrowUpRight
          className={`h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${
            isAlert || isWarn ? "text-white/80" : "text-cc-subtle"
          }`}
        />
      </div>
      <div
        className={`font-display text-[2.7rem] font-light leading-none tracking-tight sm:text-[3.6rem] ${
          isAlert || isWarn ? "text-white" : "text-cc-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5">
        <div className="relative">
          <div
            className={`text-sm font-medium ${isAlert || isWarn ? "text-white" : "text-cc-ink"} ${
              hasTooltip ? "cursor-help" : ""
            }`}
          >
            {label}
          </div>
          {hasTooltip ? (
            <div
              role="tooltip"
              className="pointer-events-none absolute left-0 top-full z-10 mt-1.5 hidden min-w-[9rem] rounded-ds-lg border border-cc-border bg-cc-surface px-3 py-2 shadow-lift group-hover:block"
            >
              <ul className="space-y-0.5 text-xs text-cc-muted">
                {tooltipLines!.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {hint ? (
          <div
            className={`mt-0.5 text-xs leading-snug ${
              isAlert ? "text-white/75" : isWarn ? "text-cc-subtle" : "text-cc-muted"
            }`}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ProducaoMesCard({
  producaoMensal,
  embedded = false,
}: {
  producaoMensal: ProducaoMensalData;
  embedded?: boolean;
}) {
  const percentual = getProducaoMensalPercentual(producaoMensal);

  const content = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:gap-8">
      <div className="min-w-0 shrink-0">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
          Monthly Production
        </div>
        <div className="font-display text-xl font-light leading-tight text-cc-ink sm:text-2xl">
          {formatProducaoValor(producaoMensal.valorRealizado)}
          <span className="ml-1.5 text-sm font-light text-cc-muted">completed</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-xs text-cc-muted">
          <span>Goal: {formatProducaoValor(producaoMensal.metaMensal)}</span>
          <span className="font-medium tabular-nums text-cc-deep">{percentual}% achieved</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-cc-border-light"
          role="progressbar"
          aria-valuenow={percentual}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-cc-blue" style={{ width: `${percentual}%` }} />
        </div>
      </div>
      <div className="shrink-0 text-xs text-cc-muted sm:border-l sm:border-cc-border sm:pl-6 sm:text-right sm:text-sm">
        <span className="font-medium tabular-nums text-cc-deep">
          {producaoMensal.instalacoesConcluidas}
        </span>{" "}
        installations completed
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <div className="mt-2 rounded-ds-xl border border-cc-border bg-cc-surface px-4 py-3 shadow-sheet sm:mt-2.5 sm:px-5 sm:py-3.5">
      {content}
    </div>
  );
}

function shortEquipeNome(nome: string): string {
  const parts = nome.split(/\s*[-–]\s*/);
  return parts.length > 1 ? parts[parts.length - 1]! : nome;
}

function CapacidadeOperacionalCard({
  capacidade,
  embedded = false,
}: {
  capacidade: CapacidadeOperacionalData;
  embedded?: boolean;
}) {
  const content = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
          Capacity · week
        </span>
      </div>

      {capacidade.error ? (
        <p className="text-xs text-cc-red">
          Could not load capacity: {capacidade.error}
        </p>
      ) : capacidade.departamentos.length === 0 ? (
        <p className="text-xs text-cc-muted">No field teams in this unit.</p>
      ) : (
        <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
          {capacidade.departamentos.map((dept) => (
            <div
              key={dept.departamento}
              className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"
            >
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-cc-muted">
                {dept.departamento}
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {dept.equipes.map((equipe) => (
                  <EquipeCapacidadeItem key={equipe.id} equipe={equipe} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="mt-2.5 border-t border-cc-border/70 pt-2.5">{content}</div>
    );
  }

  return (
    <div className="mt-2 rounded-ds-xl border border-cc-border bg-cc-surface px-4 py-3 shadow-sheet sm:mt-2.5 sm:px-5 sm:py-3.5">
      {content}
    </div>
  );
}

function EquipeCapacidadeItem({
  equipe,
  compact = false,
}: {
  equipe: EquipeCapacidade;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const status = capacidadeStatusConfig[equipe.status];
  const { detalhe } = equipe;
  const pct = detalhe.ocupacaoPercentual;
  const destaque = equipe.status !== "saudavel" || pct > 0;

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          className={`inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] transition-colors hover:bg-cc-canvas ${
            destaque ? "text-cc-deep" : "text-cc-subtle"
          }`}
          aria-label={`${equipe.nome}: ${status.label}, ${pct}% occupied`}
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${destaque ? "" : "opacity-50"}`}
            style={{ backgroundColor: equipe.corPrimaria }}
            aria-hidden
          />
          <span className="truncate">{shortEquipeNome(equipe.nome)}</span>
          {destaque ? (
            <span className={`shrink-0 tabular-nums font-medium ${status.text}`}>
              {pct}%
            </span>
          ) : null}
        </button>
        {open ? <EquipeCapacidadePopover equipe={equipe} status={status} pct={pct} /> : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="group w-full rounded-ds border border-transparent px-2 py-1.5 text-left transition-colors hover:border-cc-border hover:bg-cc-canvas"
        aria-label={`${equipe.departamento} ${equipe.nome}: ${status.label}, ${pct}% occupied`}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
            style={{ backgroundColor: equipe.corPrimaria }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-cc-deep">
            {equipe.nome}
          </span>
          <span
            className={`shrink-0 text-[11px] font-semibold tabular-nums ${status.text}`}
          >
            {pct}%
          </span>
        </div>
        {destaque ? (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-cc-border-light">
            <div
              className={`h-full rounded-full transition-all ${status.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        ) : null}
      </button>
      {open ? <EquipeCapacidadePopover equipe={equipe} status={status} pct={pct} /> : null}
    </div>
  );
}

function EquipeCapacidadePopover({
  equipe,
  status,
  pct,
}: {
  equipe: EquipeCapacidade;
  status: (typeof capacidadeStatusConfig)[keyof typeof capacidadeStatusConfig];
  pct: number;
}) {
  const { detalhe } = equipe;

  return (
    <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-ds-lg border border-cc-border bg-cc-surface p-3 shadow-lift">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: equipe.corPrimaria }}
            />
            <span className="truncate text-xs font-medium text-cc-ink">{equipe.nome}</span>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-cc-muted">
            {equipe.departamento}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold ${status.text}`}>
          {status.label}
        </span>
      </div>
      <p className={`mt-2 text-xs tabular-nums ${status.text}`}>{pct}% occupied</p>
      <ul className="mt-2 space-y-0.5 border-t border-cc-border pt-2">
        {detalhe.metricas.map((m) => (
          <li key={m.label} className="flex justify-between gap-2 text-[11px] text-cc-muted">
            <span>{m.label}</span>
            <span className="font-medium tabular-nums text-cc-deep">{m.value}</span>
          </li>
        ))}
      </ul>
      {detalhe.sugestao ? (
        <p className="mt-2 rounded-ds bg-amber-50 px-2 py-1.5 text-[11px] leading-snug text-amber-800">
          {detalhe.sugestao}
        </p>
      ) : null}
    </div>
  );
}

function FilaComercialSection({
  fila,
  loadError,
  equipes,
  usuarios,
  googleMapsApiKey,
  defaultEquipeId,
  canChooseEquipe,
  unidadeId,
}: {
  fila: FilaComercialItem[];
  loadError: string | null;
  equipes: Equipe[];
  usuarios: Usuario[];
  googleMapsApiKey: string;
  defaultEquipeId: string | null;
  canChooseEquipe: boolean;
  unidadeId: string | null;
}) {
  const router = useRouter();
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <section className="mt-3 sm:mt-4">
        <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
          <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
              <span aria-hidden>📋</span>
              Awaiting First Visit
            </div>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setCadastroOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-ds bg-cc-ink px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cc-deep"
            >
              <IconPlus />
              New Client
            </button>
          </div>
          {loadError ? (
            <p className="border-b border-cc-border px-4 py-3 text-sm text-cc-red sm:px-5">
              Could not load commercial queue: {loadError}
            </p>
          ) : null}
          {formError ? (
            <p className="border-b border-cc-border bg-cc-red-soft px-4 py-3 text-sm font-medium text-cc-red sm:px-5">
              {formError}
            </p>
          ) : null}
          <ul>
            {fila.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-cc-muted sm:px-5">
                No OS awaiting first visit.
              </li>
            ) : (
              fila.map((item, i) => (
                <FilaComercialRow
                  key={item.osId}
                  item={item}
                  last={i === fila.length - 1}
                  onOpen={() =>
                    router.push(osWorkspacePathWithUnidade(item.osId, unidadeId))
                  }
                />
              ))
            )}
          </ul>
        </div>
      </section>

      <OperationalModal
        open={cadastroOpen}
        title="New client"
        onClose={() => setCadastroOpen(false)}
      >
        {formError ? (
          <p className="mb-3 rounded-sm border border-cc-red-soft bg-cc-red-soft px-3 py-2 text-sm font-medium text-cc-red">
            {formError}
          </p>
        ) : null}
        <ClienteForm
          key={`centro-create-${cadastroOpen}`}
          formKey={`centro-create-${cadastroOpen}`}
          equipes={equipes}
          usuarios={usuarios}
          apiKey={googleMapsApiKey}
          pending={pending}
          canChooseEquipe={canChooseEquipe}
          defaultEquipeId={defaultEquipeId}
          onCancel={() => setCadastroOpen(false)}
          onSubmit={(fd) => {
            startTransition(async () => {
              const result = await criarCliente(fd);
              if (!result.ok) {
                setFormError(result.message);
                return;
              }
              setFormError(null);
              setCadastroOpen(false);
              router.refresh();
            });
          }}
        />
      </OperationalModal>
    </>
  );
}

function FilaFinanceiroSection({
  fila,
  loadError,
  unidadeId,
}: {
  fila: FilaFinanceiroItem[];
  loadError: string | null;
  unidadeId: string | null;
}) {
  const router = useRouter();

  return (
    <section className="mt-3 sm:mt-4">
      <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            <CentroIcon id="dollar" className="h-3.5 w-3.5 text-emerald-600" />
            Financial Queue
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {fila.length} OS
          </span>
        </div>
        {loadError ? (
          <p className="border-b border-cc-border px-4 py-3 text-sm text-cc-red sm:px-5">
            Could not load financial queue: {loadError}
          </p>
        ) : null}
        <ul>
          {fila.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-cc-muted sm:px-5">
              No OS awaiting financial review.
            </li>
          ) : (
            fila.map((item, i) => (
              <FilaFinanceiroRow
                key={item.osId}
                item={item}
                last={i === fila.length - 1}
                onOpen={() =>
                  router.push(osWorkspacePathWithUnidade(item.osId, unidadeId))
                }
              />
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function FilaFinanceiroRow({
  item,
  last,
  onOpen,
}: {
  item: FilaFinanceiroItem;
  last: boolean;
  onOpen: () => void;
}) {
  const status = filaFinanceiroStatusBadge(item.statusAtual);
  const decision = filaFinanceiroDecisionConfig[item.financialDecision];

  return (
    <li className={last ? "" : "border-b border-cc-border"}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cc-canvas/80 sm:gap-4 sm:px-5 sm:py-3"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-cc-ink">{item.clienteNome}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.equipeNome ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-cc-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-cc-border"
                  style={{ background: item.equipeCorPrimaria ?? undefined }}
                  aria-hidden
                />
                {item.equipeNome}
              </span>
            ) : (
              <span className="text-xs text-cc-muted">No team</span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
              {status.label}
            </span>
            <span
              className={`text-[10px] font-medium uppercase tracking-wide ${decision.badge}`}
            >
              {decision.label}
            </span>
            {item.valorFinal != null && item.valorFinal > 0 ? (
              <span className="text-[10px] font-medium tabular-nums text-cc-deep">
                {formatFinanceiroValor(item.valorFinal)}
              </span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                Amount pending
              </span>
            )}
          </div>
        </div>
        <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
      </button>
    </li>
  );
}

function FilaProjetoSection({
  fila,
  loadError,
  unidadeId,
}: {
  fila: FilaProjetoItem[];
  loadError: string | null;
  unidadeId: string | null;
}) {
  const router = useRouter();

  return (
    <section className="mt-3 sm:mt-4">
      <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            <CentroIcon id="pen" className="h-3.5 w-3.5 text-violet-600" />
            Project Queue
          </div>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
            {fila.length} OS
          </span>
        </div>
        {loadError ? (
          <p className="border-b border-cc-border px-4 py-3 text-sm text-cc-red sm:px-5">
            Could not load project queue: {loadError}
          </p>
        ) : null}
        <ul>
          {fila.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-cc-muted sm:px-5">
              No OS awaiting project execution.
            </li>
          ) : (
            fila.map((item, i) => (
              <FilaProjetoRow
                key={item.osId}
                item={item}
                last={i === fila.length - 1}
                onOpen={() =>
                  router.push(osWorkspacePathWithUnidade(item.osId, unidadeId))
                }
              />
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function filaProjetoPendencias(item: FilaProjetoItem): string[] {
  const out: string[] = [];
  if (!item.temFornecedor) out.push("Supplier");
  if (!item.temDataMaterial) out.push("Material");
  if (!item.temCnc) out.push("CNC");
  if (!item.temListaSeparacao) out.push("List");
  if (!item.temInstalacaoAgendada) out.push("Installation");
  return out;
}

function FilaProjetoRow({
  item,
  last,
  onOpen,
}: {
  item: FilaProjetoItem;
  last: boolean;
  onOpen: () => void;
}) {
  const status = filaProjetoStatusBadge(item.statusAtual);
  const pendencias = filaProjetoPendencias(item);
  const bloqueadosLabel = item.ambientesBloqueados
    .map((b) => (b.motivo ? `${b.nome} (${b.motivo})` : b.nome))
    .join(" · ");

  return (
    <li className={last ? "" : "border-b border-cc-border"}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cc-canvas/80 sm:gap-4 sm:px-5 sm:py-3"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-cc-ink">{item.clienteNome}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.equipeNome ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-cc-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-cc-border"
                  style={{ background: item.equipeCorPrimaria ?? undefined }}
                  aria-hidden
                />
                {item.equipeNome}
              </span>
            ) : (
              <span className="text-xs text-cc-muted">No team</span>
            )}
            {item.retornoInstalacaoParcial ? (
              <span className="inline-flex items-center gap-1 rounded-ds bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800 ring-1 ring-red-200">
                {t("centro.projectQueue.partialInstallUrgent")}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.badge}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
                {status.label}
              </span>
            )}
            {item.retornoInstalacaoParcial ? (
              <span className="text-[10px] font-medium text-amber-900">
                {t("centro.projectQueue.partialInstallSummary", {
                  installed: item.ambientesInstalados.join(", "),
                  blocked: bloqueadosLabel,
                })}
              </span>
            ) : pendencias.length > 0 ? (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                Missing: {pendencias.join(" · ")}
              </span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                Ready to finalize
              </span>
            )}
          </div>
          {item.retornoInstalacaoParcial && pendencias.length > 0 ? (
            <p className="mt-1 text-[10px] text-cc-muted">
              {t("centro.projectQueue.partialInstallStillMissing", {
                items: pendencias.join(" · "),
              })}
            </p>
          ) : null}
        </div>
        <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
      </button>
    </li>
  );
}

function FilaRepairSection({
  fila,
  loadError,
  unidadeId,
  podeAbrirRepair,
  onAddRepair,
}: {
  fila: FilaRepairItem[];
  loadError: string | null;
  unidadeId: string | null;
  podeAbrirRepair: boolean;
  onAddRepair: () => void;
}) {
  const router = useRouter();

  return (
    <section className="mt-3 sm:mt-4">
      <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            <CentroIcon id="wrench" className="h-3.5 w-3.5 text-violet-700" />
            {t("centro.repair.queueTitle")}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900">
              {fila.length} OS
            </span>
            {podeAbrirRepair ? (
              <button
                type="button"
                onClick={onAddRepair}
                className="inline-flex items-center gap-1 rounded-sm bg-violet-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white hover:bg-violet-800"
              >
                <IconPlus className="h-3 w-3" />
                {t("centro.repair.addRepair")}
              </button>
            ) : null}
          </div>
        </div>
        {loadError ? (
          <p className="border-b border-cc-border px-4 py-3 text-sm text-cc-red sm:px-5">
            {loadError}
          </p>
        ) : null}
        <ul>
          {fila.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-cc-muted sm:px-5">
              {t("centro.repair.noActiveRepairs")}
            </li>
          ) : (
            fila.map((item, i) => (
              <li key={item.osId} className={i === fila.length - 1 ? "" : "border-b border-cc-border"}>
                <button
                  type="button"
                  onClick={() =>
                    router.push(osWorkspacePathWithUnidade(item.osId, unidadeId))
                  }
                  className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cc-canvas/80 sm:gap-4 sm:px-5 sm:py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-cc-ink">
                      {item.clienteNome}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="rounded-ds bg-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {t("os.workspace.installation.repairBadge")}
                      </span>
                      {item.ambienteNome ? (
                        <span className="text-xs text-cc-muted">{item.ambienteNome}</span>
                      ) : (
                        <span className="text-xs text-cc-muted">
                          {t("centro.repair.allAmbientes")}
                        </span>
                      )}
                      {item.quando ? (
                        <span className="text-xs text-cc-muted">{item.quando}</span>
                      ) : (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                          {t("centro.repair.notScheduled")}
                        </span>
                      )}
                    </div>
                  </div>
                  <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function FilaInstalacaoSection({
  fila,
  loadError,
  unidadeId,
}: {
  fila: FilaInstalacaoItem[];
  loadError: string | null;
  unidadeId: string | null;
}) {
  const router = useRouter();

  return (
    <section className="mt-3 sm:mt-4">
      <div className="overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface shadow-sheet">
        <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-canvas/80 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cc-muted">
            <CentroIcon id="wrench" className="h-3.5 w-3.5 text-sky-600" />
            Installation Queue
          </div>
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {fila.length} OS
          </span>
        </div>
        {loadError ? (
          <p className="border-b border-cc-border px-4 py-3 text-sm text-cc-red sm:px-5">
            Could not load installation queue: {loadError}
          </p>
        ) : null}
        <ul>
          {fila.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-cc-muted sm:px-5">
              No OS awaiting installation.
            </li>
          ) : (
            fila.map((item, i) => (
              <FilaInstalacaoRow
                key={item.osId}
                item={item}
                last={i === fila.length - 1}
                onOpen={() =>
                  router.push(osWorkspacePathWithUnidade(item.osId, unidadeId))
                }
              />
            ))
          )}
        </ul>
      </div>
    </section>
  );
}

function FilaInstalacaoRow({
  item,
  last,
  onOpen,
}: {
  item: FilaInstalacaoItem;
  last: boolean;
  onOpen: () => void;
}) {
  const status = filaInstalacaoStatusBadge(item.statusAtual);

  return (
    <li className={last ? "" : "border-b border-cc-border"}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cc-canvas/80 sm:gap-4 sm:px-5 sm:py-3"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-cc-ink">{item.clienteNome}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.equipeNome ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-cc-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-cc-border"
                  style={{ background: item.equipeCorPrimaria ?? undefined }}
                  aria-hidden
                />
                {item.equipeNome}
              </span>
            ) : (
              <span className="text-xs text-cc-muted">No team</span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.badge}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
              {status.label}
            </span>
            {item.isRepair ? (
              <span className="rounded-ds bg-violet-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {t("os.workspace.installation.repairBadge")}
              </span>
            ) : null}
            {item.instalacaoQuando ? (
              <span className="text-xs text-cc-muted">{item.instalacaoQuando}</span>
            ) : (
              <span className="text-[10px] font-medium uppercase tracking-wide text-amber-700">
                Not scheduled
              </span>
            )}
          </div>
        </div>
        <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
      </button>
    </li>
  );
}

function FilaComercialRow({
  item,
  last,
  onOpen,
}: {
  item: FilaComercialItem;
  last: boolean;
  onOpen: () => void;
}) {
  const status = filaComercialStatusConfig;

  return (
    <li className={last ? "" : "border-b border-cc-border"}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-cc-canvas/80 sm:gap-4 sm:px-5 sm:py-3"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-cc-ink group-hover:text-cc-blue-deep">
            {item.clienteNome}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.equipeNome ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-cc-muted">
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-cc-border"
                  style={{ background: item.equipeCorPrimaria ?? undefined }}
                  aria-hidden
                />
                {item.equipeNome}
              </span>
            ) : (
              <span className="text-xs text-cc-muted">No team</span>
            )}
            <span className={`inline-flex items-center gap-1 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.badge}`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.dot}`} aria-hidden />
              {status.label}
            </span>
            <span className="text-xs text-cc-muted">{formatDataCadastro(item.criadoEm)}</span>
          </div>
        </div>
        <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
      </button>
    </li>
  );
}

const priorityConfig: Record<Priority, { label: string; bar: string; rowBg: string; text: string; chipBg: string }> = {
  critico: { label: "Critical", bar: "bg-cc-rose-deep", rowBg: "bg-cc-rose-soft/50 hover:bg-cc-rose-soft", text: "text-cc-rose-deep", chipBg: "bg-cc-rose-soft" },
  urgente: { label: "Urgent", bar: "bg-amber-500", rowBg: "hover:bg-amber-100/40", text: "text-amber-600", chipBg: "bg-amber-100" },
  normal: { label: "Normal", bar: "bg-cc-blue-focus", rowBg: "hover:bg-cc-canvas", text: "text-cc-blue-deep", chipBg: "bg-cc-blue-soft" },
};

const typeLabels: Record<AttentionType, string> = {
  bloqueio: "Block",
  atrasada: "Overdue",
  critica: "Pending",
  gargalo: "Bottleneck",
};

function AttentionRow(
  props: AtencaoAgoraItem & { last: boolean; onOpen: () => void },
) {
  const { cliente, os, etapa, motivo, priority, type, tempo, acao, last, onOpen } =
    props;
  const config = priorityConfig[priority];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex w-full cursor-pointer items-center gap-2 py-2 pl-5 pr-3 text-left transition-colors sm:py-3 sm:pr-4 ${config.rowBg} ${last ? "" : "border-b border-cc-border"}`}
    >
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${config.bar}`} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
          <span className="min-w-0 truncate text-sm font-medium text-cc-ink">{cliente}</span>
          <span className="shrink-0 font-mono text-[11px] text-cc-subtle">{os}</span>
          <span className="shrink-0 text-xs text-cc-muted">·</span>
          <span className="shrink-0 text-xs text-cc-deep">{etapa}</span>
          <span
            className={`shrink-0 rounded-ds px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.chipBg} ${config.text}`}
          >
            {config.label}
          </span>
          <span className="shrink-0 rounded-ds bg-cc-border-light px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cc-muted">
            {typeLabels[type]}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs leading-normal text-cc-muted">{motivo}</p>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-[11px] text-cc-subtle">{tempo}</span>
          <span className="truncate text-[11px] font-medium text-cc-blue opacity-0 transition-opacity group-hover:opacity-100">
            {acao} →
          </span>
        </div>
      </div>
      <IconChevronRight className="h-4 w-4 shrink-0 text-cc-border-strong group-hover:text-cc-muted" />
    </button>
  );
}

function SaudeCard(props: SaudeOperacionalCard) {
  const { label, value, total, hint, status, icon } = props;
  const statusStyles = {
    ok: { bar: "bg-cc-blue-focus", badge: "bg-cc-blue-soft text-cc-blue-deep", label: "Normal" },
    atencao: { bar: "bg-amber-500", badge: "bg-amber-100 text-amber-600", label: "Attention" },
    critico: { bar: "bg-cc-rose-deep", badge: "bg-cc-rose-soft text-cc-rose-deep", label: "Critical" },
  }[status];

  return (
    <div className="group relative flex cursor-pointer items-center gap-4 overflow-hidden rounded-ds-xl border border-cc-border bg-cc-surface p-4 shadow-sheet transition-shadow hover:shadow-lift">
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${statusStyles.bar}`} />
      <div className="shrink-0 pl-2">
        <CentroIcon id={icon} className="h-5 w-5 text-cc-subtle" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-light leading-none text-cc-ink">{value}</span>
          {total !== undefined && <span className="text-sm text-cc-muted">/ {total}</span>}
        </div>
        <div className="mt-1 text-sm font-medium text-cc-deep">{label}</div>
        <div className="mt-0.5 text-xs text-cc-muted">{hint}</div>
      </div>
      <span className={`shrink-0 rounded-ds px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles.badge}`}>
        {statusStyles.label}
      </span>
    </div>
  );
}

function BloqueioRow(
  props: BloqueioOperacionalItem & { last: boolean; onOpen: () => void },
) {
  const {
    cliente,
    os,
    etapa,
    categoria,
    filterCategoria,
    motivo,
    aberto,
    dias,
    resp,
    semResponsavel,
    last,
    onOpen,
  } = props;
  const isStale = dias >= 2;
  const categoriaColor =
    bloqueioCategoriaColors[filterCategoria] ?? "bg-cc-border-light text-cc-deep";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group w-full cursor-pointer text-left transition-colors hover:bg-cc-canvas ${
        isStale ? "bg-cc-rose-soft/30 hover:bg-cc-rose-soft/50" : ""
      } ${last ? "" : "border-b border-cc-border"}`}
    >
      <div className="items-center px-4 py-2.5 sm:px-5 sm:py-3 md:grid md:grid-cols-[1.2fr_0.7fr_0.8fr_0.9fr_2fr_0.9fr_0.7fr] md:gap-3">
        <div className="mb-1.5 flex min-w-0 items-center gap-2 md:mb-0">
          <IconLock className="h-3.5 w-3.5 shrink-0 text-cc-rose" />
          <span className="truncate text-sm font-medium text-cc-ink">{cliente}</span>
        </div>
        <Cell label="OS" compact>
          <span className="font-mono text-[11px] text-cc-muted">{os}</span>
        </Cell>
        <Cell label="Stage" compact>
          <span className="text-xs text-cc-deep">{etapa}</span>
        </Cell>
        <Cell label="Category" compact>
          <span
            className={`inline-block rounded-ds px-1.5 py-0.5 text-[10px] font-medium ${categoriaColor}`}
          >
            {categoria}
          </span>
        </Cell>
        <Cell label="Reason" compact className="text-xs leading-snug text-cc-deep">
          <span className="line-clamp-2 md:line-clamp-1">{motivo}</span>
        </Cell>
        <Cell
          label="Opened"
          compact
          className={`text-xs ${isStale ? "font-medium text-cc-rose-deep" : "text-cc-muted"}`}
        >
          {aberto}
          {dias >= 2 && (
            <span className="mt-0.5 block text-[10px] text-cc-rose">{dias} days</span>
          )}
        </Cell>
        <Cell label="Resp." compact className="text-xs text-cc-deep">
          {semResponsavel ? (
            <span className="inline-block rounded-ds bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              {resp}
            </span>
          ) : (
            <span className="truncate">{resp}</span>
          )}
        </Cell>
      </div>
    </button>
  );
}

function Cell({
  label,
  children,
  className = "",
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mb-1.5" : "mb-2"} md:mb-0 ${className}`}>
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle md:hidden">
        {label}
      </span>
      {children}
    </div>
  );
}
