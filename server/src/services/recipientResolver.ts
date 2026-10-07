import type { ConversationContext, StoredMessage } from '../types/index.js';

/**
 * Calcula, NO SERVIDOR, quem deve receber o push. Nunca usa lista enviada pelo app.
 *
 * - direct: o outro participante.
 * - group + all_group_messages: todos os integrantes (exceto o remetente).
 * - group + mentioned_members: somente mencionados/selecionados.
 * - group + direct_messages_only | disabled: ninguém.
 *
 * Sempre: remetente excluído e apenas participantes da conversa.
 */
export function resolveRecipients(context: ConversationContext, message: StoredMessage): string[] {
  const participants = new Set(context.participantIds);
  let candidates: string[] = [];

  if (context.type === 'direct') {
    candidates = context.participantIds;
  } else {
    switch (context.policy) {
      case 'all_group_messages':
        candidates = context.participantIds;
        break;
      case 'mentioned_members': {
        const mentioned = [...message.mentionedUserIds];
        if (message.target.type === 'member') mentioned.push(message.target.memberId);
        candidates = mentioned;
        break;
      }
      case 'direct_messages_only':
      case 'disabled':
        candidates = [];
        break;
    }
  }

  const unique = new Set(candidates.filter((uid) => uid !== message.senderId && participants.has(uid)));
  return [...unique];
}
