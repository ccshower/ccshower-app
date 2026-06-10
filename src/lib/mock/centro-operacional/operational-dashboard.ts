import type { CentroIconId } from "@/components/admin/centro-operacional/centro-operacional-icons";

export type Priority = "critico" | "urgente" | "normal";
export type AttentionType = "bloqueio" | "atrasada" | "critica" | "gargalo";
export type BloqueioCategoria = "Client" | "Financial" | "Project" | "Material" | "Installation";
export type EtapaFluxo = "Commercial" | "Financial" | "Project" | "Installation" | "Measurement";
export type AgendaTipo =
  | "Technical Visit"
  | "Measurement"
  | "Installation"
  | "Material Delivery"
  | "Project"
  | "Financial";

export interface PulseMetric {
  label: string;
  value: number;
  hint: string;
  icon: CentroIconId;
  critical?: boolean;
  warn?: boolean;
  /** Linhas exibidas em tooltip ao passar o mouse (ex.: breakdown do card). */
  tooltipLines?: string[];
}

export interface AttentionItem {
  id: string;
  cliente: string;
  os: string;
  etapa: EtapaFluxo;
  motivo: string;
  priority: Priority;
  type: AttentionType;
  tempo: string;
  acao: string;
}

export interface AgendaEvent {
  hora: string;
  tipo: AgendaTipo;
  cliente: string;
  equipe: string;
  endereco: string;
  status: "confirmado" | "pendente" | "em_campo";
}

export interface SaudeItem {
  label: string;
  value: number;
  total?: number;
  hint: string;
  status: "ok" | "atencao" | "critico";
  icon: CentroIconId;
}

export interface BloqueioItem {
  id: string;
  cliente: string;
  os: string;
  etapa: EtapaFluxo;
  categoria: BloqueioCategoria;
  motivo: string;
  aberto: string;
  dias: number;
  resp: string;
}

export const attentionItems: AttentionItem[] = [
  {
    id: "a1",
    cliente: "Renata Pacheco",
    os: "OS-2847",
    etapa: "Installation",
    motivo: "Vidro quebrado no transporte — instalação suspensa",
    priority: "critico",
    type: "bloqueio",
    tempo: "Há 2h",
    acao: "Resolver bloqueio",
  },
  {
    id: "a2",
    cliente: "Edifício Marfim — Apto 1402",
    os: "OS-2812",
    etapa: "Project",
    motivo: "Perfil cromado fora de estoque — aguardando fornecedor",
    priority: "critico",
    type: "bloqueio",
    tempo: "Há 1 dia",
    acao: "Contatar fornecedor",
  },
  {
    id: "a3",
    cliente: "Construtora Vértice — Torre B",
    os: "OS-2798",
    etapa: "Commercial",
    motivo: "Financiamento recusado pelo banco parceiro",
    priority: "critico",
    type: "bloqueio",
    tempo: "Há 3 dias",
    acao: "Revisar proposta",
  },
  {
    id: "a4",
    cliente: "Henrique Lobo",
    os: "OS-2835",
    etapa: "Financial",
    motivo: "Aprovação de orçamento pendente há 3 dias úteis",
    priority: "urgente",
    type: "atrasada",
    tempo: "3 dias",
    acao: "Cobrar aprovação",
  },
  {
    id: "a5",
    cliente: "Studio Arq. Bellini",
    os: "OS-2851",
    etapa: "Installation",
    motivo: "Instalação agendada para hoje — acesso ao prédio não confirmado",
    priority: "urgente",
    type: "critica",
    tempo: "Hoje, 14h",
    acao: "Confirmar acesso",
  },
  {
    id: "a6",
    cliente: "Residencial Parque Sul",
    os: "OS-2764",
    etapa: "Project",
    motivo: "Gargalo: 8 OS aguardando aprovação de projeto simultaneamente",
    priority: "urgente",
    type: "gargalo",
    tempo: "Acumulado",
    acao: "Redistribuir fila",
  },
  {
    id: "a7",
    cliente: "Marina Toledo",
    os: "OS-2844",
    etapa: "Measurement",
    motivo: "Cliente solicitou reagendamento — nova data pendente",
    priority: "normal",
    type: "critica",
    tempo: "Ontem",
    acao: "Reagendar",
  },
  {
    id: "a8",
    cliente: "Hotel Aurora — Suítes",
    os: "OS-2801",
    etapa: "Installation",
    motivo: "Material incorreto entregue — perfil errado na obra",
    priority: "critico",
    type: "bloqueio",
    tempo: "Há 5h",
    acao: "Trocar material",
  },
];

export const attentionFilters: { id: AttentionType | "todos"; label: string; count: number }[] = [
  { id: "todos", label: "All", count: attentionItems.length },
  { id: "bloqueio", label: "Blocks", count: attentionItems.filter((i) => i.type === "bloqueio").length },
  { id: "atrasada", label: "Overdue", count: attentionItems.filter((i) => i.type === "atrasada").length },
  { id: "critica", label: "Pending items", count: attentionItems.filter((i) => i.type === "critica").length },
  { id: "gargalo", label: "Bottlenecks", count: attentionItems.filter((i) => i.type === "gargalo").length },
];

export const agendaHoje: AgendaEvent[] = [
  { hora: "08:00", tipo: "Technical Visit", cliente: "Família Andrade", equipe: "Comercial · A", endereco: "Moema, SP", status: "em_campo" },
  { hora: "09:00", tipo: "Installation", cliente: "Renata Pacheco", equipe: "Instalação · B", endereco: "Pinheiros, SP", status: "pendente" },
  { hora: "10:30", tipo: "Measurement", cliente: "Edifício Marfim", equipe: "Projeto · A", endereco: "Vila Olímpia, SP", status: "confirmado" },
  { hora: "11:00", tipo: "Material Delivery", cliente: "Henrique Lobo", equipe: "Logística", endereco: "Brooklin, SP", status: "confirmado" },
  { hora: "14:00", tipo: "Installation", cliente: "Studio Arq. Bellini", equipe: "Instalação · C", endereco: "Jardins, SP", status: "pendente" },
  { hora: "16:30", tipo: "Technical Visit", cliente: "Marina Toledo", equipe: "Comercial · A", endereco: "Itaim Bibi, SP", status: "confirmado" },
];

export const agendaAmanha: AgendaEvent[] = [
  { hora: "08:30", tipo: "Measurement", cliente: "Construtora Vértice", equipe: "Projeto · B", endereco: "Santo Amaro, SP", status: "confirmado" },
  { hora: "10:00", tipo: "Installation", cliente: "Hotel Aurora", equipe: "Instalação · A", endereco: "Centro, SP", status: "pendente" },
  { hora: "15:00", tipo: "Installation", cliente: "Residencial Parque Sul", equipe: "Instalação · B", endereco: "Morumbi, SP", status: "confirmado" },
];

export const saudeOperacional: SaudeItem[] = [
  { label: "OS em Andamento", value: 47, hint: "+4 vs. semana passada", status: "ok", icon: "clipboard" },
  { label: "Instalações da Semana", value: 18, total: 22, hint: "4 pendentes de confirmação", status: "atencao", icon: "wrench" },
  { label: "Financeiros Pendentes", value: 9, hint: "3 aguardando há +2 dias", status: "atencao", icon: "dollar" },
  { label: "Projetos Pendentes", value: 14, hint: "Gargalo na fila de aprovação", status: "critico", icon: "pen" },
];

export const bloqueios: BloqueioItem[] = [
  { id: "b1", cliente: "Renata Pacheco", os: "OS-2847", etapa: "Installation", categoria: "Material", motivo: "Vidro quebrado no transporte", aberto: "Hoje, 07:42", dias: 0, resp: "Lucas M." },
  { id: "b2", cliente: "Hotel Aurora — Suítes", os: "OS-2801", etapa: "Installation", categoria: "Material", motivo: "Material incorreto entregue na obra", aberto: "Hoje, 09:15", dias: 0, resp: "Lucas M." },
  { id: "b3", cliente: "Edifício Marfim — 1402", os: "OS-2812", etapa: "Project", categoria: "Material", motivo: "Perfil cromado fora de estoque", aberto: "Ontem, 14:10", dias: 1, resp: "Patrícia R." },
  { id: "b4", cliente: "Construtora Vértice", os: "OS-2798", etapa: "Commercial", categoria: "Client", motivo: "Cliente não confirma visita técnica", aberto: "2 dias atrás", dias: 2, resp: "André S." },
  { id: "b5", cliente: "Construtora Vértice — Torre B", os: "OS-2798", etapa: "Financial", categoria: "Financial", motivo: "Financiamento recusado pelo banco", aberto: "3 dias atrás", dias: 3, resp: "Camila R." },
  { id: "b6", cliente: "Residencial Parque Sul", os: "OS-2764", etapa: "Project", categoria: "Project", motivo: "Projeto aguardando aprovação do cliente", aberto: "4 dias atrás", dias: 4, resp: "Patrícia R." },
  { id: "b7", cliente: "Studio Arq. Bellini", os: "OS-2851", etapa: "Installation", categoria: "Installation", motivo: "Acesso ao prédio não liberado pela portaria", aberto: "Hoje, 06:00", dias: 0, resp: "Lucas M." },
];

export const bloqueioCategorias: { id: BloqueioCategoria | "todos"; label: string; count: number }[] = [
  { id: "todos", label: "All", count: bloqueios.length },
  { id: "Client", label: "Client", count: bloqueios.filter((b) => b.categoria === "Client").length },
  { id: "Financial", label: "Financial", count: bloqueios.filter((b) => b.categoria === "Financial").length },
  { id: "Project", label: "Project", count: bloqueios.filter((b) => b.categoria === "Project").length },
  { id: "Material", label: "Material", count: bloqueios.filter((b) => b.categoria === "Material").length },
  { id: "Installation", label: "Installation", count: bloqueios.filter((b) => b.categoria === "Installation").length },
];

export function getTodayFormatted() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export const agendaTipoConfig: Record<
  AgendaTipo,
  { color: string; bg: string; icon: CentroIconId }
> = {
  "Technical Visit": { color: "text-cc-blue-deep", bg: "bg-cc-blue-soft", icon: "users" },
  Measurement: { color: "text-cc-deep", bg: "bg-cc-border-light", icon: "pen" },
  Installation: { color: "text-cc-rose-deep", bg: "bg-cc-rose-soft", icon: "wrench" },
  "Material Delivery": { color: "text-cc-muted", bg: "bg-cc-border-light", icon: "truck" },
  Project: { color: "text-cc-deep", bg: "bg-cc-border-light", icon: "pen" },
  Financial: { color: "text-cc-deep", bg: "bg-cc-border-light", icon: "dollar" },
};

export const bloqueioCategoriaColors: Record<BloqueioCategoria, string> = {
  Client: "bg-cc-blue-soft text-cc-blue-deep",
  Financial: "bg-cc-border text-cc-deep",
  Project: "bg-cc-border-light text-cc-deep",
  Material: "bg-cc-rose-soft text-cc-rose-deep",
  Installation: "bg-cc-ink text-white",
};
