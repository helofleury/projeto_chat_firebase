import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  type Unsubscribe,
} from 'firebase/database';
import { collection, onSnapshot, query as fsQuery, where } from 'firebase/firestore';

import { apiRequest } from './apiClient';
import { database, firestore } from './firebase';
import { AppError } from '../utils/errors';
import { isRecord } from '../utils/validation';
import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  DirectConversationDoc,
  MessageTarget,
  SendMessageInput,
} from '../types/chat';

const MESSAGE_PAGE_SIZE = 200;

/** Cria (ou localiza) a conversa individual. O id é derivado dos dois uid. */
export async function ensureDirectConversation(otherUserId: string): Promise<string> {
  const { conversationId } = await apiRequest<{ conversationId: string }>('POST', '/conversations/direct', {
    otherUserId,
  });
  return conversationId;
}

export function subscribeDirectConversations(
  uid: string,
  onConversations: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = fsQuery(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snapshot) =>
      onConversations(
        snapshot.docs.map((d) => {
          const data = d.data() as DirectConversationDoc;
          return { id: d.id, type: 'direct', participants: data.participantIds, createdAt: data.createdAt };
        }),
      ),
    onError,
  );
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function parseMentions(value: unknown): string[] {
  // O Realtime Database não guarda arrays vazios e devolve arrays como objetos/listas.
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (isRecord(value)) return Object.values(value).filter((v): v is string => typeof v === 'string');
  return [];
}

function toChatMessage(id: string, conversationId: string, raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const { conversationType, senderId, text, createdAt } = raw;
  if (
    (conversationType !== 'direct' && conversationType !== 'group') ||
    typeof senderId !== 'string' ||
    typeof text !== 'string' ||
    typeof createdAt !== 'number'
  ) {
    return null;
  }
  return {
    id,
    conversationId,
    conversationType,
    senderId,
    text,
    target: parseTarget(raw.target),
    mentionedUserIds: parseMentions(raw.mentionedUserIds),
    createdAt,
  };
}

/**
 * Escuta as mensagens da conversa em tempo real. Retorna a função que remove
 * o listener (deve ser chamada ao desmontar a tela ou trocar de conversa).
 */
export function subscribeMessages(
  conversationId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const messagesQuery = query(
    ref(database, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(MESSAGE_PAGE_SIZE),
  );
  return onValue(
    messagesQuery,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const message = toChatMessage(child.key ?? '', conversationId, child.val());
        if (message) list.push(message);
      });
      onMessages(list);
    },
    onError,
  );
}

export type WrittenMessage = { messageId: string; committed: Promise<void> };

/**
 * Persiste a mensagem no Realtime Database. `committed` resolve quando o
 * servidor confirma a gravação (offline, a escrita fica na fila do SDK).
 */
export function writeMessage(input: SendMessageInput): WrittenMessage {
  const messageRef = push(ref(database, `messages/${input.conversationId}`));
  const messageId = messageRef.key;
  if (!messageId) throw new AppError('Não foi possível criar a mensagem.');

  const targetMemberId = input.conversationType === 'group' ? input.mentionedUserIds[0] : undefined;
  const target: MessageTarget =
    targetMemberId !== undefined ? { type: 'member', memberId: targetMemberId } : { type: 'conversation' };

  const payload = {
    conversationType: input.conversationType,
    senderId: input.senderId,
    text: input.text,
    target,
    mentionedUserIds: input.conversationType === 'group' ? input.mentionedUserIds : [],
    createdAt: serverTimestamp(),
  };
  return { messageId, committed: set(messageRef, payload) };
}

export type PushRequestResponse = { status: 'sent' | 'duplicate' | 'skipped'; recipients: number };

/**
 * Pede à API online o envio do push. O app só envia conversationId e
 * messageId; os destinatários são calculados no servidor.
 */
export async function requestPushNotification(
  conversationId: string,
  messageId: string,
): Promise<PushRequestResponse> {
  return apiRequest<PushRequestResponse>('POST', '/notifications/messages', { conversationId, messageId });
}

export type { ConversationType };
