/** Nome do cliente para filas do centro — titulo "Visit — X" quando RLS oculta clientes. */
export function clienteNomeFromOsTitulo(titulo: string | null | undefined): string | null {
  const raw = titulo?.trim();
  if (!raw) return null;
  const match = raw.match(/^Visit\s*[—–-]\s*(.+)$/i);
  return (match?.[1] ?? raw).trim() || null;
}

export function resolveFilaClienteNome(
  clienteNome: string | null | undefined,
  osTitulo: string | null | undefined,
): string {
  return clienteNome?.trim() || clienteNomeFromOsTitulo(osTitulo) || "Cliente";
}
