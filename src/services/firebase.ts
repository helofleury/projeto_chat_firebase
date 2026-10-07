import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

import firebaseConfig from '../../firebaseConfig.json';

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

// `getReactNativePersistence` só existe no bundle React Native do SDK.
type FirebaseAuthWithRN = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: AsyncStorageLike) => Persistence;
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as FirebaseOptions);

function createAuth(): Auth {
  try {
    const { getReactNativePersistence, initializeAuth } = FirebaseAuth as FirebaseAuthWithRN;
    // A persistência em AsyncStorage permite recuperar a sessão ao reabrir o app.
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // Fast refresh: o Auth já foi inicializado.
    return FirebaseAuth.getAuth(app);
  }
}

export const auth: Auth = createAuth();
export const firestore = getFirestore(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
