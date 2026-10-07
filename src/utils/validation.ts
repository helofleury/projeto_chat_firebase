export function validateName(name: string): string | null {
  return name.trim().length >= 2 ? null : 'Informe seu nome completo.';
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Informe um e-mail válido.';
}

export function validatePassword(password: string): string | null {
  return password.length >= 6 ? null : 'A senha deve ter pelo menos 6 caracteres.';
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function validatePhone(phone: string): string | null {
  const digits = onlyDigits(phone);
  return digits.length >= 10 && digits.length <= 13
    ? null
    : 'Informe o celular com DDD (ex.: 11999998888).';
}

/** Máscara DD/MM/AAAA enquanto o usuário digita. */
export function maskBirthDate(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Converte DD/MM/AAAA em AAAA-MM-DD. Retorna null se inválida. */
export function parseBirthDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  if (!isRealDate || year < 1900 || date.getTime() > Date.now()) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatBirthDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : iso;
}

export function formatPhone(digits: string): string {
  const d = onlyDigits(digits);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digits;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function delay(ms: number): Promise<'timeout'> {
  return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
