import { Router } from 'express';

import { HttpError, isRecord, requireId } from '../errors.js';
import { asyncHandler, authenticate, getUid } from '../middleware/authenticate.js';
import { linkPairs } from '../services/contactsService.js';
import { db } from '../services/firebaseAdmin.js';
import { setConversationMember } from '../services/groupAdminService.js';

export const conversationsRouter = Router();

function directConversationId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

// POST /conversations/direct  { otherUserId }
conversationsRouter.post(
  '/direct',
  authenticate,
  asyncHandler(async (req, res) => {
    const uid = getUid(req);
    const body: unknown = req.body;
    if (!isRecord(body)) throw new HttpError(400, 'invalid_request', 'Corpo da requisição inválido.');
    const otherUserId = requireId(body.otherUserId, 'otherUserId');

    if (otherUserId === uid) {
      throw new HttpError(400, 'self_conversation', 'Você não pode conversar consigo mesmo.');
    }
    const otherProfile = await db.collection('publicProfiles').doc(otherUserId).get();
    if (!otherProfile.exists) throw new HttpError(404, 'user_not_found', 'Usuário não encontrado.');

    const conversationId = directConversationId(uid, otherUserId);
    const participantIds = uid < otherUserId ? [uid, otherUserId] : [otherUserId, uid];

    // O id determinístico garante uma única conversa por par; create() falha se já existir.
    try {
      await db.collection('directConversations').doc(conversationId).create({ participantIds, createdAt: Date.now() });
    } catch (error) {
      const code = isRecord(error) ? error.code : undefined;
      if (code !== 6 && code !== 'already-exists') throw error; // 6 = ALREADY_EXISTS
    }

    // Idempotente: garante acesso às mensagens e vínculo de perfis.
    await Promise.all([
      setConversationMember(conversationId, uid, true),
      setConversationMember(conversationId, otherUserId, true),
    ]);
    await linkPairs(conversationId, [[uid, otherUserId]]);
    res.json({ conversationId });
  }),
);
