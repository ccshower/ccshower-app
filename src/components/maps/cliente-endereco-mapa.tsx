function googleMapsSearchUrl(enderecoFormatado: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoFormatado.trim())}`;
}

export function ClienteEnderecoMapsLink({
  enderecoFormatado,
}: {
  enderecoFormatado: string;
}) {
  const endereco = enderecoFormatado.trim();
  if (!endereco) return null;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm leading-snug text-cc-deep">
        <span aria-hidden>📍 </span>
        {endereco}
      </p>
      <a
        href={googleMapsSearchUrl(endereco)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center rounded-ds border border-cc-border bg-white px-3 py-1.5 text-xs font-medium text-cc-deep transition-colors hover:border-cc-border-strong hover:bg-cc-canvas"
      >
        Abrir no Google Maps
      </a>
    </div>
  );
}
