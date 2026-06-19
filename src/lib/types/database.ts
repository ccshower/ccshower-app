export type TipoUsuario = "comum" | "manager" | "admin";

export type Unidade = {
  id: string;
  nome: string;
  timezone: string;
  /** Monthly production goal shown in Operational Center. */
  meta_producao_mensal: number;
  /** Jacksonville — recebe legado e é fallback de novos registros. */
  matriz: boolean;
  ativo: boolean;
  criado_em: string;
};

export type Equipe = {
  id: string;
  nome: string;
  unidade_id?: string | null;
  /** commercial | financial_review | project | installation */
  codigo_operacional?: string | null;
  cor_primaria: string;
  cor_secundaria: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type Usuario = {
  id: string;
  empresa_id?: string | null;
  unidade_id?: string | null;
  nome: string;
  telefone: string | null;
  email: string;
  equipe_id: string | null;
  tipo_usuario: TipoUsuario;
  pode_editar_agenda: boolean;
  pode_ver_todas_equipes: boolean;
  pode_gerenciar_estoque: boolean;
  pode_resolver_crash: boolean;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type UsuarioWithEquipe = Usuario & {
  equipe: Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria"> | null;
  unidade?: Pick<Unidade, "id" | "nome" | "matriz"> | null;
};

import type { ClientType, TipoCliente } from "@/lib/clientes/tipo-cliente";

export type { ClientType, TipoCliente };

export type Cliente = {
  id: string;
  empresa_id?: string | null;
  unidade_id?: string | null;
  nome: string;
  telefone: string;
  email: string | null;
  tipo_cliente: TipoCliente;
  endereco_formatado: string;
  endereco_linha1: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  pais: string;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  google_maps_url: string | null;
  observacoes: string | null;
  equipe_id: string | null;
  criado_por: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

export type ClienteWithRelations = Cliente & {
  equipe: Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria"> | null;
};

export type OrdemServicoStatus =
  | "open"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OrdemServico = {
  id: string;
  empresa_id: string;
  unidade_id?: string | null;
  cliente_id: string;
  titulo: string;
  descricao: string | null;
  observacoes: string | null;
  anotacoes_tecnicas: string | null;
  status: OrdemServicoStatus;
  equipe_id: string | null;
  responsavel_id: string | null;
  valor_previsto: number | null;
  valor_comercial: number | null;
  valor_projeto: number | null;
  valor_final: number | null;
  financial_decision: string;
  financial_rejection_reason: string | null;
  visit_payment_received: boolean;
  visit_payment_amount: number | null;
  visit_payment_method: string | null;
  visit_payment_notes: string | null;
  forma_pagamento: string | null;
  banco_financiamento: string | null;
  installation_notes: string | null;
  fornecedor_id: string | null;
  data_prevista_material: string | null;
  installation_execution_notes: string | null;
  installation_payment_received: boolean;
  installation_payment_amount: number | null;
  installation_payment_method: string | null;
  installation_payment_notes: string | null;
  installation_balance_pending_acknowledged: boolean;
  possui_instalacao: boolean;
  repair_ativo?: boolean;
  repair_episode_id?: string | null;
  equipe_atual_id: string | null;
  etapa_atual: string;
  status_atual: string;
  criado_por: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

/** Resumo de OS para listagem rápida na tela de clientes. */
export type ClienteOsResumo = {
  id: string;
  cliente_id: string;
  titulo: string;
  status: OrdemServicoStatus;
  atualizado_em: string;
  etapa_atual: string;
  status_atual: string;
  /** Equipe responsável atual (cor dinâmica do banco). */
  equipe_atual: Pick<Equipe, "id" | "nome" | "cor_primaria"> | null;
  /** Legado — equipe vinculada na criação. */
  equipe: Pick<Equipe, "nome" | "cor_primaria"> | null;
};

export type OsAnexo = {
  id: string;
  empresa_id: string;
  ordem_servico_id: string;
  os_ambiente_id?: string | null;
  tipo: string;
  storage_path: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  criado_por: string | null;
  criado_em: string;
};

export type OsAmbiente = {
  id: string;
  ordem_servico_id: string;
  empresa_id: string | null;
  nome: string;
  especificacoes: string | null;
  valor_comercial: number | null;
  sort_order: number;
  ativo: boolean;
  instalacao_status?: string;
  instalacao_bloqueio_categoria?: string | null;
  instalacao_bloqueio_motivo?: string | null;
  instalacao_bloqueio_observacao?: string | null;
  instalacao_concluida_em?: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type OsAnexoComUrl = OsAnexo & { url: string };

export type CatalogoItem = {
  id: string;
  nome: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  ativo: boolean;
  criado_em: string;
};

export type Fornecedor = {
  id: string;
  nome: string;
  ativo: boolean;
  criado_em: string;
};

/** Bloqueio operacional (tabela técnica os_crashes). */
export type OsCrash = {
  id: string;
  ordem_servico_id: string;
  empresa_id: string | null;
  etapa: string;
  categoria: string;
  motivo: string;
  observacao: string | null;
  status: "ativo" | "resolvido";
  criado_por: string | null;
  resolvido_por: string | null;
  resolvido_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type OsSeparationListItem = {
  id: string;
  ordem_servico_id: string;
  empresa_id: string | null;
  item_id: string;
  quantity: number;
  notes: string | null;
  sort_order: number;
  qty_reserved: number;
  qty_separated: number;
  qty_checked: number;
  qty_consumed: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
  catalogo_item?: Pick<CatalogoItem, "id" | "nome" | "categoria" | "unidade"> | null;
};

export type OsRepairEpisode = {
  id: string;
  ordem_servico_id: string;
  os_ambiente_id: string | null;
  empresa_id: string | null;
  valor_sugerido: number | null;
  valor_final: number | null;
  valor_alteracao_observacao: string | null;
  aberto_por: string | null;
  aberto_em: string;
  concluido_em: string | null;
  agenda_evento_id: string | null;
  status: "open" | "completed" | "cancelled";
};

export type OrdemServicoWithRelations = OrdemServico & {
  cliente: Pick<
    Cliente,
    | "id"
    | "nome"
    | "telefone"
    | "email"
    | "endereco_formatado"
    | "tipo_cliente"
    | "observacoes"
    | "google_maps_url"
    | "latitude"
    | "longitude"
  > | null;
  equipe: Pick<Equipe, "id" | "nome" | "cor_primaria" | "cor_secundaria"> | null;
  responsavel: Pick<Usuario, "id" | "nome"> | null;
  /** Visita técnica — data_inicio/data_fim são a fonte oficial de data/hora. */
  visita_inicial: Pick<
    AgendaEvento,
    "id" | "data_inicio" | "data_fim" | "status" | "tipo_evento"
  > | null;
  /** Instalação agendada na etapa Projeto — aparece no calendário operacional. */
  instalacao_agendada: Pick<
    AgendaEvento,
    "id" | "data_inicio" | "data_fim" | "status" | "tipo_evento" | "equipe_id"
  > | null;
  fornecedor: Pick<Fornecedor, "id" | "nome"> | null;
  eventos?: AgendaEventoTimeline[];
  criado_por_usuario?: Pick<Usuario, "id" | "nome"> | null;
  anexos_visita?: OsAnexoComUrl[];
  ambientes?: OsAmbiente[];
  lista_separacao?: OsSeparationListItem[];
  anexo_cnc?: OsAnexoComUrl | null;
  /** All technical drawing uploads for the project stage. */
  anexos_cnc?: OsAnexoComUrl[];
  /** Fluxo REPAIR ativo — instalação de manutenção pós-conclusão. */
  repair_episode?: OsRepairEpisode | null;
  bloqueio_ativo?: OsCrash | null;
  /** Preenchido na listagem quando há `os_crashes` ativo (sem carregar o registro completo). */
  tem_bloqueio_ativo?: boolean;
};

/** Evento da agenda com equipe e responsável (timeline). */
export type AgendaEventoTimeline = AgendaEvento & {
  equipe: Pick<
    Equipe,
    "id" | "nome" | "cor_primaria" | "codigo_operacional" | "ativo"
  > | null;
  responsavel: Pick<Usuario, "id" | "nome"> | null;
};

export type AgendaEventoStatus =
  | "scheduled"
  | "confirmed"
  | "on_site"
  | "completed"
  | "cancelled";

export type AgendaEvento = {
  id: string;
  ordem_servico_id: string;
  cliente_id: string;
  equipe_id: string | null;
  responsavel_id: string | null;
  tipo_evento: string;
  etapa: string;
  status: AgendaEventoStatus;
  titulo: string;
  descricao: string | null;
  data_evento: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  hora_evento?: string | null;
  is_repair?: boolean;
  criado_em: string;
  atualizado_em: string;
};

/** Evento com endereco resolvido via cliente (consulta com join). */
export type AgendaEventoComCliente = AgendaEvento & {
  clientes: Pick<
    Cliente,
    "id" | "endereco_formatado" | "latitude" | "longitude"
  > | null;
};
