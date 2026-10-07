export const MIN_GROUP_MEMBERS = 2;
export const MAX_MEMBER_LIMIT = 50;
export const MAX_GROUP_NAME_LENGTH = 60;

export type LimitValidation =
  | { valid: true; value: number }
  | { valid: false; error: string };

export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1) return 'Informe o nome do grupo.';
  if (trimmed.length > MAX_GROUP_NAME_LENGTH) {
    return `O nome pode ter no máximo ${MAX_GROUP_NAME_LENGTH} caracteres.`;
  }
  return null;
}

/**
 * Valida o limite digitado. `currentMembers` impede reduzir o limite para um
 * valor menor que a quantidade atual de integrantes.
 */
export function validateMemberLimit(raw: string, currentMembers: number): LimitValidation {
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { valid: false, error: 'O limite deve ser um número inteiro.' };
  const value = Number(text);
  if (value < MIN_GROUP_MEMBERS) {
    return { valid: false, error: `O limite mínimo é ${MIN_GROUP_MEMBERS} integrantes.` };
  }
  if (value > MAX_MEMBER_LIMIT) {
    return { valid: false, error: `O limite máximo é ${MAX_MEMBER_LIMIT} integrantes.` };
  }
  if (value < currentMembers) {
    return {
      valid: false,
      error: `O limite não pode ser menor que a quantidade atual de integrantes (${currentMembers}).`,
    };
  }
  return { valid: true, value };
}

export function availableSlots(limit: number, currentMembers: number): number {
  return Math.max(0, limit - currentMembers);
}

export function describeSlots(limit: number, currentMembers: number): string {
  const slots = availableSlots(limit, currentMembers);
  if (slots === 0) return `${currentMembers}/${limit} integrantes · grupo sem vagas`;
  return `${currentMembers}/${limit} integrantes · ${slots} ${slots === 1 ? 'vaga disponível' : 'vagas disponíveis'}`;
}
