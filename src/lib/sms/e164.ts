/** Número discável em E.164. Dez dígitos nacionais viram +1. */
export function toE164Phone(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) return null;
    if (digits.startsWith("1")) {
      return digits.length === 11 && isNanpSubscriber(digits.slice(1))
        ? `+${digits}`
        : null;
    }
    return `+${digits}`;
  }

  if (digits.length === 10 && isNanpSubscriber(digits)) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1") && isNanpSubscriber(digits.slice(1))) {
    return `+${digits}`;
  }
  return null;
}

/** NANP: código de área e prefixo não começam com 0 ou 1. */
function isNanpSubscriber(tenDigits: string): boolean {
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(tenDigits);
}
