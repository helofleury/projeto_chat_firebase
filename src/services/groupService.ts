import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import { uploadImage } from './storageService';
import type { ChatGroup, CreateGroupInput, GroupDetailsUpdate, GroupDoc } from '../types/group';

function toGroup(id: string, data: GroupDoc): ChatGroup {
  return { ...data, id };
}

export function subscribeGroups(
  uid: string,
  onGroups: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const groupsQuery = query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => onGroups(snapshot.docs.map((d) => toGroup(d.id, d.data() as GroupDoc))),
    onError,
  );
}

export function subscribeGroup(
  groupId: string,
  onGroup: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'groups', groupId),
    (snapshot) => onGroup(snapshot.exists() ? toGroup(snapshot.id, snapshot.data() as GroupDoc) : null),
    onError,
  );
}

type CreateGroupResponse = { groupId: string };

/**
 * A criação passa pela API: ela valida limite/integrantes e sincroniza o
 * acesso às mensagens no Realtime Database. A foto é enviada em seguida,
 * já que as regras do Storage exigem que o grupo exista.
 */
export async function createGroup(input: CreateGroupInput): Promise<string> {
  const { groupId } = await apiRequest<CreateGroupResponse>('POST', '/groups', {
    name: input.name.trim(),
    memberIds: input.memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
  });
  if (input.photoUri) {
    const photoUrl = await uploadImage(`groupPhotos/${groupId}/photo.jpg`, input.photoUri);
    await updateGroupDetails(groupId, { photoUrl });
  }
  return groupId;
}

export async function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`groupPhotos/${groupId}/photo.jpg`, localUri);
}

/** Metadados editáveis diretamente pelo proprietário (validado pelas regras). */
export async function updateGroupDetails(groupId: string, changes: GroupDetailsUpdate): Promise<void> {
  const payload: GroupDetailsUpdate & { updatedAt: number } = { ...changes, updatedAt: Date.now() };
  await updateDoc(doc(firestore, 'groups', groupId), payload);
}

export async function updateNotificationPolicy(
  groupId: string,
  notificationPolicy: GroupDetailsUpdate['notificationPolicy'],
): Promise<void> {
  await updateGroupDetails(groupId, { notificationPolicy });
}

export async function addGroupMember(groupId: string, memberId: string): Promise<void> {
  await apiRequest<{ ok: true }>('POST', `/groups/${groupId}/members`, { memberId });
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await apiRequest<{ ok: true }>('DELETE', `/groups/${groupId}/members/${memberId}`);
}

export async function updateMemberLimit(groupId: string, memberLimit: number): Promise<void> {
  await apiRequest<{ ok: true }>('PATCH', `/groups/${groupId}/limit`, { memberLimit });
}
