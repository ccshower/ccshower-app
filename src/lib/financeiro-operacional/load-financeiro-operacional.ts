import { mesOperacionalBoundsIso } from "@/lib/centro-operacional/mes-operacional-bounds";

import { createClient } from "@/lib/supabase/server";

import type { Cliente } from "@/lib/types/database";



import {

  buildAguardandoAprovacao,

  buildClientesEmAberto,

  calcRecebidoConfirmadoOperacional,

  FINANCEIRO_OPERACIONAL_VAZIO,

  somaValorFinal,

  type FinanceiroOperacionalData,

  type OsFinanceiroRow,

} from "./financeiro-operacional";



const OS_SELECT = `

  id,

  titulo,

  cliente_id,

  status,

  etapa_atual,

  financial_decision,

  forma_pagamento,

  valor_final,

  visit_payment_amount,

  visit_payment_received,

  installation_payment_amount,

  installation_payment_received,

  atualizado_em

`;



async function loadClienteNomeMap(

  supabase: Awaited<ReturnType<typeof createClient>>,

  clienteIds: string[],

): Promise<Map<string, string>> {

  const map = new Map<string, string>();

  if (!clienteIds.length) return map;



  const { data, error } = await supabase

    .from("clientes")

    .select("id, nome")

    .in("id", clienteIds)

    .eq("ativo", true);



  if (error) throw new Error(error.message);



  for (const cliente of (data ?? []) as Pick<Cliente, "id" | "nome">[]) {

    map.set(cliente.id, cliente.nome);

  }



  return map;

}



export async function loadFinanceiroOperacional(

  unidadeId?: string | null,

): Promise<FinanceiroOperacionalData> {

  const bounds = mesOperacionalBoundsIso();

  if (!bounds) {

    return {

      ...FINANCEIRO_OPERACIONAL_VAZIO,

      error: "Período operacional inválido",

    };

  }



  const supabase = await createClient();



  let osAtivasQuery = supabase

    .from("ordens_servico")

    .select(OS_SELECT)

    .eq("ativo", true);

  if (unidadeId) osAtivasQuery = osAtivasQuery.eq("unidade_id", unidadeId);



  let faturadoQuery = supabase

    .from("ordens_servico")

    .select("valor_final")

    .eq("ativo", true)

    .eq("status", "completed")

    .eq("etapa_atual", "completed")

    .gte("atualizado_em", bounds.start)

    .lt("atualizado_em", bounds.end);

  if (unidadeId) faturadoQuery = faturadoQuery.eq("unidade_id", unidadeId);



  /**

   * Recebido no mês (provisório): OS atualizadas no período com pagamentos confirmados.

   * TODO(Bill): substituir consulta por recebimentos oficiais da integração Bill.

   */

  let recebidoQuery = supabase

    .from("ordens_servico")

    .select(

      "visit_payment_amount, visit_payment_received, installation_payment_amount, installation_payment_received",

    )

    .eq("ativo", true)

    .gte("atualizado_em", bounds.start)

    .lt("atualizado_em", bounds.end)

    .or("visit_payment_received.eq.true,installation_payment_received.eq.true");

  if (unidadeId) recebidoQuery = recebidoQuery.eq("unidade_id", unidadeId);



  let saldoQuery = supabase

    .from("ordens_servico")

    .select(OS_SELECT)

    .eq("ativo", true)

    .not("valor_final", "is", null)

    .gt("valor_final", 0)

    .neq("status", "cancelled");

  if (unidadeId) saldoQuery = saldoQuery.eq("unidade_id", unidadeId);



  const [osAtivasRes, faturadoRes, recebidoRes, saldoRes] = await Promise.all([

    osAtivasQuery,

    faturadoQuery,

    recebidoQuery,

    saldoQuery,

  ]);



  const error =

    osAtivasRes.error?.message ??

    faturadoRes.error?.message ??

    recebidoRes.error?.message ??

    saldoRes.error?.message ??

    null;



  if (error) {

    return { ...FINANCEIRO_OPERACIONAL_VAZIO, error };

  }



  const saldoRows = (saldoRes.data ?? []) as OsFinanceiroRow[];

  const clienteIds = [

    ...new Set(

      saldoRows.map((row) => row.cliente_id).filter((id): id is string => Boolean(id)),

    ),

  ];



  let clienteMap: Map<string, string>;

  try {

    clienteMap = await loadClienteNomeMap(supabase, clienteIds);

  } catch (clienteError) {

    return {

      ...FINANCEIRO_OPERACIONAL_VAZIO,

      error: clienteError instanceof Error ? clienteError.message : "Erro ao carregar clientes",

    };

  }



  const osAtivas = (osAtivasRes.data ?? []) as OsFinanceiroRow[];

  const aguardando = buildAguardandoAprovacao(osAtivas);

  const faturadoNoMes = somaValorFinal((faturadoRes.data ?? []) as OsFinanceiroRow[]);



  const recebidoNoMes = ((recebidoRes.data ?? []) as OsFinanceiroRow[]).reduce(

    (acc, row) => acc + calcRecebidoConfirmadoOperacional(row),

    0,

  );



  const clientesEmAberto = buildClientesEmAberto(saldoRows, clienteMap);



  return {

    aguardando,

    faturadoNoMes,

    recebidoNoMes: Math.round(recebidoNoMes * 100) / 100,

    clientesEmAberto,

    error: null,

  };

}


