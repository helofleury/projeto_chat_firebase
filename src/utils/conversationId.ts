/**
 * O identificador de uma conversa individual é derivado dos dois uid
 * ordenados. Assim, o mesmo par de usuários sempre gera o mesmo id e não
 * existem conversas duplicadas.
 */
export function getDirectConversationId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

export function getDirectParticipants(conversationId: string): [string, string] | null {
  const parts = conversationId.split('_');
  if (parts.length !== 2 || parts[0] === '' || parts[1] === '') return null;
  return [parts[0], parts[1]];
}

export function getOtherParticipantId(conversationId: string, myUid: string): string | null {
  const participants = getDirectParticipants(conversationId);
  if (!participants || !participants.includes(myUid)) return null;
  return participants[0] === myUid ? participants[1] : participants[0];
}
