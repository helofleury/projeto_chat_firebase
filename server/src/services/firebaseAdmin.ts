import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function createApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: readEnv('FIREBASE_PROJECT_ID'),
      clientEmail: readEnv('FIREBASE_CLIENT_EMAIL'),
      // Hospedagens costumam armazenar a chave com "\n" literais.
      privateKey: readEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
    databaseURL: readEnv('FIREBASE_DATABASE_URL'),
  });
}

const app = createApp();

export const adminAuth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const messaging = getMessaging(app);
