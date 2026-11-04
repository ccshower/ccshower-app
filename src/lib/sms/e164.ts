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

/** Dígitos locais dos EUA, sem o prefixo do país. */
export function nationalNanpDigits(value: string | null | undefined): string {
  const digits = String(value ?? "").replace(/\D/g, "");
  const local =
    digits.length >= 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return local.slice(0, 10);
}

/** Máscara (000) 000-0000 para o campo, com o +1 fora do texto. */
export function formatNanpLocal(digits: string): string {
  const local = digits.slice(0, 10);
  if (local.length <= 3) return local;
  if (local.length <= 6) return `(${local.slice(0, 3)}) ${local.slice(3)}`;
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
}

/** Valor gravado. Número válido dos EUA sai sempre em E.164 com +1. */
export function phoneForStorage(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return toE164Phone(raw) ?? raw;
}

/** Estado do campo: +1 e os 10 dígitos, quando o número é dos EUA. */
export function phoneFieldValue(value: string | null | undefined): string {
  const stored = toE164Phone(value);
  if (stored?.startsWith("+1")) return stored;
  const local = nationalNanpDigits(value);
  return local ? `+1${local}` : String(value ?? "").trim();
}
