/**
 * Chave de API do Google Maps (Credentials → API key).
 * NÃO usar OAuth Client ID (.apps.googleusercontent.com).
 */
export function validateGoogleMapsApiKey(key: string): {
  valid: boolean;
  message: string | null;
} {
  const trimmed = key.trim();
  if (!trimmed) {
    return {
      valid: false,
      message:
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY vazia. Crie uma API key em Google Cloud → Credentials.",
    };
  }
  if (trimmed.includes("googleusercontent.com")) {
    return {
      valid: false,
      message:
        "Valor incorreto: isso e um OAuth Client ID, nao uma API key. Em Credentials, use Create credentials → API key (comeca com AIza...).",
    };
  }
  if (!trimmed.startsWith("AIza")) {
    return {
      valid: false,
      message:
        "Formato invalido para Maps: a API key costuma comecar com AIza. Confira em Google Cloud → Credentials → API key.",
    };
  }
  return { valid: true, message: null };
}
