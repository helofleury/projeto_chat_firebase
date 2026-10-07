import type { DocumentReference } from 'firebase-admin/firestore';

import { isRecord } from '../errors.js';
import type { TokenType } from '../types/index.js';
import { messaging } from './firebaseAdmin.js';

export type DeviceTarget = { ref: DocumentReference; token: string; tokenType: TokenType };

export type PushPayload = {
  title: string;
  body: string;
  data: { conversationId: string; conversationType: string; messageId: string };
};

export type SendResult = { delivered: number; failed: number; invalidDevices: DocumentReference[] };

const FCM_INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const FCM_BATCH = 500;
const EXPO_BATCH = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/** Android: envio direto pelo Firebase Cloud Messaging (Admin SDK). */
async function sendViaFcm(targets: DeviceTarget[], payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { delivered: 0, failed: 0, invalidDevices: [] };

  for (const batch of chunk(targets, FCM_BATCH)) {
    const response = await messaging.sendEachForMulticast({
      tokens: batch.map((t) => t.token),
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high', notification: { channelId: 'default' } },
    });
    response.responses.forEach((item, index) => {
      if (item.success) {
        result.delivered += 1;
        return;
      }
      result.failed += 1;
      if (item.error && FCM_INVALID_TOKEN_CODES.has(item.error.code)) {
        result.invalidDevices.push(batch[index].ref);
      }
    });
  }
  return result;
}

/** iOS: Expo Push Service (entrega via APNs). */
async function sendViaExpo(targets: DeviceTarget[], payload: PushPayload): Promise<SendResult> {
  const result: SendResult = { delivered: 0, failed: 0, invalidDevices: [] };

  for (const batch of chunk(targets, EXPO_BATCH)) {
    const messages = batch.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      priority: 'high',
    }));
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    const json: unknown = await response.json().catch(() => null);
    const tickets = isRecord(json) && Array.isArray(json.data) ? (json.data as unknown[]) : [];

    batch.forEach((target, index) => {
      const ticket = tickets[index];
      if (isRecord(ticket) && ticket.status === 'ok') {
        result.delivered += 1;
        return;
      }
      result.failed += 1;
      if (isRecord(ticket) && isRecord(ticket.details) && ticket.details.error === 'DeviceNotRegistered') {
        result.invalidDevices.push(target.ref);
      }
    });
  }
  return result;
}

export async function sendToDevices(targets: DeviceTarget[], payload: PushPayload): Promise<SendResult> {
  const unique = new Map<string, DeviceTarget>();
  for (const target of targets) unique.set(target.token, target); // evita token duplicado

  const all = [...unique.values()];
  const [fcm, expo] = await Promise.all([
    sendViaFcm(all.filter((t) => t.tokenType === 'fcm'), payload),
    sendViaExpo(all.filter((t) => t.tokenType === 'expo'), payload),
  ]);
  return {
    delivered: fcm.delivered + expo.delivered,
    failed: fcm.failed + expo.failed,
    invalidDevices: [...fcm.invalidDevices, ...expo.invalidDevices],
  };
}
