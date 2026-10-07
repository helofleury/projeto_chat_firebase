import { FieldValue } from 'firebase-admin/firestore';

import { db } from './firebaseAdmin.js';

/**
 * users/{uid}/contacts/{otherUid} indica que "otherUid" compartilha ao menos
 * uma conversa com "uid". As regras do Firestore usam esse vínculo para liberar
 * a leitura dos dados cadastrais completos. Somente a API escreve aqui.
 */
function contactRef(owner: string, other: string) {
  return db.collection('users').doc(owner).collection('contacts').doc(other);
}

export async function linkPairs(conversationId: string, pairs: [string, string][]): Promise<void> {
  const writer = db.bulkWriter();
  const now = Date.now();
  for (const [a, b] of pairs) {
    const data = { conversationIds: FieldValue.arrayUnion(conversationId), updatedAt: now };
    void writer.set(contactRef(a, b), data, { merge: true });
    void writer.set(contactRef(b, a), data, { merge: true });
  }
  await writer.close();
}

export function allPairs(uids: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  for (let i = 0; i < uids.length; i += 1) {
    for (let j = i + 1; j < uids.length; j += 1) pairs.push([uids[i], uids[j]]);
  }
  return pairs;
}

export async function linkNewMember(conversationId: string, newUid: string, existing: string[]): Promise<void> {
  await linkPairs(conversationId, existing.map((uid): [string, string] => [newUid, uid]));
}

export async function unlinkMember(conversationId: string, removedUid: string, remaining: string[]): Promise<void> {
  const refs = remaining.flatMap((uid) => [contactRef(removedUid, uid), contactRef(uid, removedUid)]);
  if (refs.length === 0) return;

  const writer = db.bulkWriter();
  const now = Date.now();
  for (const ref of refs) {
    void writer.set(ref, { conversationIds: FieldValue.arrayRemove(conversationId), updatedAt: now }, { merge: true });
  }
  await writer.close();

  // Remove o vínculo quando não resta nenhuma conversa em comum.
  const snapshots = await db.getAll(...refs);
  const cleanup = db.bulkWriter();
  for (const snap of snapshots) {
    const ids: unknown = snap.get('conversationIds');
    if (Array.isArray(ids) && ids.length === 0) void cleanup.delete(snap.ref);
  }
  await cleanup.close();
}
