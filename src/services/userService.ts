import { doc, getDoc, onSnapshot, collection, type Unsubscribe } from 'firebase/firestore';

import { firestore } from './firebase';
import type { ChatUser, PublicProfile } from '../types/user';

export function subscribeOwnProfile(
  uid: string,
  onProfile: (profile: ChatUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => onProfile(snapshot.exists() ? (snapshot.data() as ChatUser) : null),
    onError,
  );
}

export function subscribePublicProfiles(
  onProfiles: (profiles: PublicProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firestore, 'publicProfiles'),
    (snapshot) => {
      const profiles = snapshot.docs.map((d) => d.data() as PublicProfile);
      onProfiles([...profiles].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    },
    onError,
  );
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snapshot = await getDoc(doc(firestore, 'publicProfiles', uid));
  return snapshot.exists() ? (snapshot.data() as PublicProfile) : null;
}

/**
 * Perfil completo. As regras do Firestore só permitem a leitura para o próprio
 * usuário ou para quem compartilha uma conversa/grupo com ele; caso contrário
 * a chamada falha com permission-denied.
 */
export async function getFullProfile(uid: string): Promise<ChatUser | null> {
  const snapshot = await getDoc(doc(firestore, 'users', uid));
  return snapshot.exists() ? (snapshot.data() as ChatUser) : null;
}
