type Destino = {
  latitude?: number | null;
  longitude?: number | null;
  endereco_formatado?: string | null;
};

export function clienteDirectionsUrl(params: {
  originLat: number;
  originLng: number;
  cliente: Destino;
}): string | null {
  const { originLat, originLng, cliente } = params;
  let destination: string | null = null;
  if (
    cliente.latitude != null &&
    cliente.longitude != null &&
    Number.isFinite(cliente.latitude) &&
    Number.isFinite(cliente.longitude)
  ) {
    destination = `${cliente.latitude},${cliente.longitude}`;
  } else if (cliente.endereco_formatado?.trim()) {
    destination = encodeURIComponent(cliente.endereco_formatado.trim());
  }
  if (!destination) return null;
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destination}` +
    `&travelmode=driving`
  );
}
