import { useCallback, useEffect, useState } from 'react';

import { requestPushNotification, subscribeMessages, writeMessage } from '../services/chatService';
import type { ChatMessage, ConversationType } from '../types/chat';
import { getErrorMessage } from '../utils/errors';
import { delay } from '../utils/validation';

const SEND_TIMEOUT_MS = 8000;

export function useChat(conversationId: string, conversationType: ConversationType, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Listener em tempo real: removido ao desmontar a tela ou trocar de conversa.
  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessages([]);
    const unsubscribe = subscribeMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [conversationId, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const dismissSendError = useCallback(() => setSendError(null), []);

  const sendMessage = useCallback(
    async (text: string, mentionedUserIds: string[]): Promise<boolean> => {
      const trimmed = text.trim();
      if (trimmed === '') return false;

      setSending(true);
      setSendError(null);
      setNotifyWarning(null);
      try {
        const { messageId, committed } = writeMessage({
          conversationId,
          conversationType,
          senderId: userId,
          text: trimmed,
          mentionedUserIds,
        });

        // O push só é solicitado depois que o servidor confirma a gravação.
        const notified = committed.then(async () => {
          try {
            await requestPushNotification(conversationId, messageId);
          } catch {
            setNotifyWarning('Mensagem enviada, mas a notificação push não pôde ser disparada.');
          }
        });
        notified.catch(() => undefined);

        const outcome = await Promise.race([committed.then(() => 'ok' as const), delay(SEND_TIMEOUT_MS)]);
        if (outcome === 'timeout') {
          setSendError('Sem conexão. A mensagem será enviada quando a internet voltar.');
          notified.catch((err: unknown) => setSendError(getErrorMessage(err)));
        }
        return true;
      } catch (err) {
        setSendError(getErrorMessage(err));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, userId],
  );

  return { messages, loading, error, sending, sendError, notifyWarning, sendMessage, reload, dismissSendError };
}
