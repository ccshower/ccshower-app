/** Fila Reparos — OS em fluxo REPAIR (manutenção pós-instalação). */

export type FilaRepairItem = {
  osId: string;
  clienteId: string;
  clienteNome: string;
  equipeId: string | null;
  equipeNome: string | null;
  equipeCorPrimaria: string | null;
  statusAtual: string;
  agendada: boolean;
  quando: string | null;
  valorSugerido: number | null;
  ambienteNome: string | null;
  atualizadoEm: string;
};
