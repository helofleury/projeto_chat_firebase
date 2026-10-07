import { Router } from 'express';

import { HttpError, isRecord, requireId } from '../errors.js';
import { asyncHandler, authenticate, getUid } from '../middleware/authenticate.js';
import { db, rtdb } from '../services/firebaseAdmin.js';
import { sendToDevices, type DeviceTarget } from '../services/notificationSender.js';
import { resolveRecipients } from '../services/recipientResolver.js';
import type {
  ConversationContext,
  DeviceDoc,
  GroupDoc,
  MessageTarget,
  StoredMessage,
} from '../types/index.js';

export const notificationsRouter = Router();

const STALE_PROCESSING_MS = 2 * 60 * 1000;

function parseMessage(raw: unknown): StoredMessage | null {
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
  const target: MessageTarget =
    isRecord(raw.target) && raw.target.type === 'member' && typeof raw.target.memberId === 'string'
      ? { type: 'member', memberId: raw.target.memberId }
      : { type: 'conversation' };

  const rawMentions = raw.mentionedUserIds;
  const mentionList = Array.isArray(rawMentions)
    ? rawMentions
    : isRecord(rawMentions)
      ? Object.values(rawMentions)
      : [];
  const mentionedUserIds = mentionList.filter((v): v is string => typeof v === 'string');

  return { conversationType, senderId, text, target, mentionedUserIds, createdAt };
}

async function loadConversation(conversationId: string): Promise<ConversationContext | null> {
  const groupSnap = await db.collection('groups').doc(conversationId).get();
  if (groupSnap.exists) {
    const group = groupSnap.data() as GroupDoc;
    return { type: 'group', participantIds: group.memberIds, policy: group.notificationPolicy, name: group.name };
  }
  const directSnap = await db.collection('directConversations').doc(conversationId).get();
  if (directSnap.exists) {
    const ids: unknown = directSnap.get('participantIds');
    if (Array.isArray(ids)) {
      return { type: 'direct', participantIds: ids.filter((v): v is string => typeof v === 'string') };
    }
  }
  return null;
}

/** Garante que a mesma mensagem não gere pushes repetidos (idempotência). */
async function acquireNotificationLock(logId: string, senderId: string): Promise<boolean> {
  const logRef = db.collection('notificationLogs').doc(logId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(logRef);
    if (snap.exists) {
      const status: unknown = snap.get('status');
      const startedAt: unknown = snap.get('startedAt');
      const staleProcessing =
        status === 'processing' && typeof startedAt === 'number' && Date.now() - startedAt > STALE_PROCESSING_MS;
      if (status !== 'failed' && !staleProcessing) return false;
    }
    tx.set(logRef, { status: 'processing', senderId, startedAt: Date.now() });
    return true;
  });
}

// POST /notifications/messages  { conversationId, messageId }
notificationsRouter.post(
  '/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const uid = getUid(req);
    const body: unknown = req.body;
    if (!isRecord(body)) throw new HttpError(400, 'invalid_request', 'Corpo da requisição inválido.');
    const conversationId = requireId(body.conversationId, 'conversationId');
    const messageId = requireId(body.messageId, 'messageId');

    // 1. A mensagem precisa existir no Realtime Database e pertencer ao usuário autenticado.
    const messageSnap = await rtdb.ref(`messages/${conversationId}/${messageId}`).get();
    const message = parseMessage(messageSnap.val());
    if (!message) throw new HttpError(404, 'message_not_found', 'Mensagem não encontrada.');
    if (message.senderId !== uid) {
      throw new HttpError(403, 'sender_mismatch', 'A mensagem não pertence ao usuário autenticado.');
    }

    // 2. Participantes e política vêm do Firestore (nunca do app).
    const conversation = await loadConversation(conversationId);
    if (!conversation) throw new HttpError(404, 'conversation_not_found', 'Conversa não encontrada.');
    if (conversation.type !== message.conversationType) {
      throw new HttpError(400, 'type_mismatch', 'Tipo de conversa inconsistente.');
    }
    if (!conversation.participantIds.includes(uid)) {
      throw new HttpError(403, 'not_participant', 'Você não participa desta conversa.');
    }

    // 3. Destinatários calculados no servidor.
    const recipients = resolveRecipients(conversation, message);
    if (recipients.length === 0) {
      res.json({ status: 'skipped', recipients: 0 });
      return;
    }

    // 4. Proteção contra chamadas duplicadas.
    const logId = `${conversationId}__${messageId}`;
    const acquired = await acquireNotificationLock(logId, uid);
    if (!acquired) {
      res.json({ status: 'duplicate', recipients: recipients.length });
      return;
    }
    const logRef = db.collection('notificationLogs').doc(logId);

    try {
      // 5. Tokens ativos dos destinatários.
      const deviceSnaps = await Promise.all(
        recipients.map((rid) =>
          db.collection('users').doc(rid).collection('devices').where('enabled', '==', true).get(),
        ),
      );
      const targets: DeviceTarget[] = deviceSnaps.flatMap((snap) =>
        snap.docs.map((doc) => {
          const device = doc.data() as DeviceDoc;
          return { ref: doc.ref, token: device.token, tokenType: device.tokenType };
        }),
      );

      // 6. Texto genérico: não expõe o conteúdo da mensagem.
      const senderSnap = await db.collection('publicProfiles').doc(uid).get();
      const senderName = String(senderSnap.get('name') ?? 'Alguém');
      const title = conversation.type === 'group' ? conversation.name : senderName;
      const bodyText =
        conversation.type === 'group' ? `${senderName} enviou uma nova mensagem` : 'Nova mensagem';

      const result = await sendToDevices(targets, {
        title,
        body: bodyText,
        data: { conversationId, conversationType: conversation.type, messageId },
      });

      // 7. Tokens inválidos são desativados.
      await Promise.all(result.invalidDevices.map((ref) => ref.update({ enabled: false, updatedAt: Date.now() })));

      await logRef.set(
        { status: 'sent', delivered: result.delivered, failed: result.failed, finishedAt: Date.now() },
        { merge: true },
      );
      res.json({ status: 'sent', recipients: recipients.length, delivered: result.delivered, failed: result.failed });
    } catch (error) {
      await logRef.set({ status: 'failed', finishedAt: Date.now() }, { merge: true }).catch(() => undefined);
      throw error;
    }
  }),
);
