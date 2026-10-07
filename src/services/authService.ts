import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { doc, writeBatch } from 'firebase/firestore';

import { auth, firestore } from './firebase';
import { uploadImage } from './storageService';
import type { ChatUser, PublicProfile, RegisterInput } from '../types/user';

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function registerWithEmail(input: RegisterInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  const uid = credential.user.uid;

  try {
    const photoUrl = input.photoUri
      ? await uploadImage(`profilePhotos/${uid}/avatar.jpg`, input.photoUri)
      : '';

    const profile: ChatUser = {
      uid,
      name: input.name.trim(),
      email,
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      photoUrl,
      createdAt: Date.now(),
    };
    const publicProfile: PublicProfile = { uid, name: profile.name, photoUrl };

    // Gravação atômica do perfil completo e do perfil público.
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'users', uid), profile);
    batch.set(doc(firestore, 'publicProfiles', uid), publicProfile);
    await batch.commit();
  } catch (error) {
    // Evita conta "órfã" sem perfil no Firestore.
    await deleteUser(credential.user).catch(() => undefined);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
