import { FieldValue } from 'firebase-admin/firestore';

import { HttpError } from '../errors.js';
import { NOTIFICATION_POLICIES, type GroupDoc, type NotificationPolicy } from '../types/index.js';
import { allPairs, linkNewMember, linkPairs, unlinkMember } from './contactsService.js';
import { db, rtdb } from './firebaseAdmin.js';

export const MIN_MEMBERS = 2;
export const MAX_LIMIT = 50;

export type CreateGroupParams = {
  name: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && (NOTIFICATION_POLICIES as readonly string[]).includes(value);
}

export function assertValidLimit(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < MIN_MEMBERS || value > MAX_LIMIT) {
    throw new HttpError(400, 'invalid_limit', `O limite deve ser um inteiro entre ${MIN_MEMBERS} e ${MAX_LIMIT}.`);
  }
  return value;
}

async function assertProfilesExist(uids: string[]): Promise<void> {
  const refs = uids.map((uid) => db.collection('publicProfiles').doc(uid));
  const snapshots = await db.getAll(...refs);
  if (snapshots.some((snap) => !snap.exists)) {
    throw new HttpError(404, 'user_not_found', 'Algum usuário informado não existe.');
  }
}

export async function setConversationMember(conversationId: string, uid: string, allowed: boolean): Promise<void> {
  const memberRef = rtdb.ref(`conversationMembers/${conversationId}/${uid}`);
  if (allowed) await memberRef.set(true);
  else await memberRef.remove();
}

export async function createGroup(ownerId: string, params: CreateGroupParams): Promise<string> {
  const memberIds = [...new Set([ownerId, ...params.memberIds])];
  const name = params.name.trim();

  if (name.length < 1 || name.length > 60) {
    throw new HttpError(400, 'invalid_name', 'O nome do grupo deve ter entre 1 e 60 caracteres.');
  }
  if (memberIds.length < MIN_MEMBERS) {
    throw new HttpError(400, 'too_few_members', 'O grupo precisa de pelo menos dois integrantes.');
  }
  if (memberIds.length > params.memberLimit) {
    throw new HttpError(409, 'group_full', 'A quantidade de integrantes excede o limite do grupo.');
  }
  await assertProfilesExist(memberIds);

  const ref = db.collection('groups').doc();
  const now = Date.now();
  const group: GroupDoc = {
    name,
    photoUrl: '',
    ownerId,
    memberIds,
    memberLimit: params.memberLimit,
    notificationPolicy: params.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  };
  await ref.create(group);

  // Libera a leitura/escrita de mensagens no Realtime Database para os integrantes.
  await rtdb.ref(`conversationMembers/${ref.id}`).set(Object.fromEntries(memberIds.map((uid) => [uid, true])));
  await linkPairs(ref.id, allPairs(memberIds));
  return ref.id;
}

/**
 * Adiciona integrante dentro de uma TRANSAÇÃO do Firestore: a leitura do grupo e
 * a escrita são atômicas. Se duas requisições concorrentes tentarem ocupar a
 * última vaga, o Firestore reexecuta a transação perdedora, que então enxerga o
 * grupo cheio e falha com group_full. Assim o limite nunca é ultrapassado.
 */
export async function addMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
  await assertProfilesExist([memberId]);
  const groupRef = db.collection('groups').doc(groupId);

  const previousMembers = await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new HttpError(404, 'not_found', 'Grupo não encontrado.');
    const group = snap.data() as GroupDoc;

    if (group.ownerId !== requesterId) {
      throw new HttpError(403, 'not_owner', 'Somente o proprietário pode adicionar integrantes.');
    }
    if (group.memberIds.includes(memberId)) {
      throw new HttpError(409, 'already_member', 'Este usuário já é integrante do grupo.');
    }
    if (group.memberIds.length >= group.memberLimit) {
      throw new HttpError(409, 'group_full', 'O grupo atingiu o limite de integrantes.');
    }
    tx.update(groupRef, { memberIds: FieldValue.arrayUnion(memberId), updatedAt: Date.now() });
    return group.memberIds;
  });

  await setConversationMember(groupId, memberId, true);
  await linkNewMember(groupId, memberId, previousMembers);
}

/** O proprietário remove qualquer integrante; um integrante pode remover apenas a si mesmo (sair). */
export async function removeMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
  const groupRef = db.collection('groups').doc(groupId);

  const remaining = await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new HttpError(404, 'not_found', 'Grupo não encontrado.');
    const group = snap.data() as GroupDoc;

    const isOwner = group.ownerId === requesterId;
    if (!isOwner && requesterId !== memberId) {
      throw new HttpError(403, 'not_owner', 'Somente o proprietário pode remover integrantes.');
    }
    if (memberId === group.ownerId) {
      throw new HttpError(400, 'owner_cannot_leave', 'O proprietário não pode ser removido do grupo.');
    }
    if (!group.memberIds.includes(memberId)) return group.memberIds; // idempotente
    if (group.memberIds.length - 1 < MIN_MEMBERS) {
      throw new HttpError(409, 'too_few_members', 'O grupo precisa manter pelo menos dois integrantes.');
    }
    tx.update(groupRef, { memberIds: FieldValue.arrayRemove(memberId), updatedAt: Date.now() });
    return group.memberIds.filter((uid) => uid !== memberId);
  });

  // Revoga o acesso às mensagens (também executado em reenvio idempotente).
  await setConversationMember(groupId, memberId, false);
  await unlinkMember(groupId, memberId, remaining);
}

export async function updateLimit(groupId: string, requesterId: string, newLimit: number): Promise<void> {
  const groupRef = db.collection('groups').doc(groupId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists) throw new HttpError(404, 'not_found', 'Grupo não encontrado.');
    const group = snap.data() as GroupDoc;

    if (group.ownerId !== requesterId) {
      throw new HttpError(403, 'not_owner', 'Somente o proprietário pode alterar o limite.');
    }
    if (newLimit < group.memberIds.length) {
      throw new HttpError(
        409,
        'limit_below_members',
        `O limite não pode ser menor que a quantidade atual de integrantes (${group.memberIds.length}).`,
      );
    }
    tx.update(groupRef, { memberLimit: newLimit, updatedAt: Date.now() });
  });
}
