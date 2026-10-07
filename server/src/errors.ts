export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Ids são usados em caminhos do banco: aceita somente caracteres seguros. */
export function requireId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !SAFE_ID.test(value)) {
    throw new HttpError(400, 'invalid_request', `Campo inválido: ${field}.`);
  }
  return value;
}
