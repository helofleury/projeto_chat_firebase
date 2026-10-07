import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { firestore } from './firebase';
import type {
  DevicePlatform,
  DeviceRecord,
  NotificationRoute,
  PushRegistrationStatus,
  PushTokenType,
} from '../types/notification';
import { isRecord } from '../utils/validation';

const DEVICE_ID_KEY = 'chat.deviceId';
const ANDROID_CHANNEL_ID = 'default';

let activeConversationId: string | null = null;
const handledResponses = new Set<string>();

/** Informa qual conversa está aberta para não exibir banner dela em primeiro plano. */
export function setActiveConversation(conversationId: string | null): void {
  activeConversationId = conversationId;
}

function parseConversationType(value: unknown): NotificationRoute['conversationType'] | null {
  return value === 'direct' || value === 'group' ? value : null;
}

/** Extrai { conversationId, conversationType } do payload (com fallbacks por plataforma). */
export function extractRoute(value: unknown, depth = 0): NotificationRoute | null {
  if (!isRecord(value) || depth > 2) return null;
  const conversationType = parseConversationType(value.conversationType);
  if (typeof value.conversationId === 'string' && conversationType) {
    return { conversationId: value.conversationId, conversationType };
  }
  for (const key of ['body', 'dataString']) {
    const nested = value[key];
    if (typeof nested === 'string') {
      try {
        const route = extractRoute(JSON.parse(nested) as unknown, depth + 1);
        if (route) return route;
      } catch {
        // payload não é JSON; ignora
      }
    }
  }
  return null;
}

/** Interpreta o toque numa notificação. Cada notificação é tratada apenas uma vez. */
export function parseNotificationRoute(response: Notifications.NotificationResponse): NotificationRoute | null {
  const request = response.notification.request;
  if (handledResponses.has(request.identifier)) return null;

  const candidates: unknown[] = [request.content.data];
  const trigger = request.trigger;
  if (trigger && typeof trigger === 'object' && 'remoteMessage' in trigger && trigger.remoteMessage) {
    candidates.push(trigger.remoteMessage.data);
  }
  for (const candidate of candidates) {
    const route = extractRoute(candidate);
    if (route) {
      handledResponses.add(request.identifier);
      return route;
    }
  }
  return null;
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const route = extractRoute(notification.request.content.data);
      const isOpenConversation = route !== null && route.conversationId === activeConversationId;
      return {
        shouldShowBanner: !isOpenConversation,
        shouldShowList: !isOpenConversation,
        shouldPlaySound: !isOpenConversation,
        shouldSetBadge: false,
      };
    },
  });
}

async function getDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const created = `${Platform.OS}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

type ResolvedToken = { token: string; tokenType: PushTokenType };

/**
 * Android: token FCM nativo (a API envia direto pelo FCM / Admin SDK).
 * iOS: Expo Push Token (a API envia pelo Expo Push Service, que usa APNs).
 */
async function resolvePushToken(): Promise<ResolvedToken | null> {
  if (Platform.OS === 'android') {
    const native = await Notifications.getDevicePushTokenAsync();
    return typeof native.data === 'string' ? { token: native.data, tokenType: 'fcm' } : null;
  }
  const projectId: unknown = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (typeof projectId !== 'string' || projectId.startsWith('SEU_')) return null;
  const expo = await Notifications.getExpoPushTokenAsync({ projectId });
  return { token: expo.data, tokenType: 'expo' };
}

async function saveDevice(uid: string, resolved: ResolvedToken, enabled: boolean): Promise<void> {
  const deviceId = await getDeviceId();
  const platform: DevicePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
  const record: DeviceRecord = {
    token: resolved.token,
    tokenType: resolved.tokenType,
    platform,
    enabled,
    updatedAt: Date.now(),
  };
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), record);
}

export async function registerDeviceForPush(uid: string): Promise<PushRegistrationStatus> {
  try {
    if (!Device.isDevice) return 'unavailable';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Mensagens',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== Notifications.PermissionStatus.GRANTED) {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== Notifications.PermissionStatus.GRANTED) return 'denied';

    const resolved = await resolvePushToken();
    if (!resolved) return 'no_token';

    await saveDevice(uid, resolved, true);
    return 'registered';
  } catch {
    return 'error';
  }
}

/** Mantém o token atualizado quando o FCM/APNs o renova. */
export function listenTokenRefresh(uid: string): () => void {
  const subscription = Notifications.addPushTokenListener(async (token) => {
    if (typeof token.data !== 'string' || Platform.OS !== 'android') return;
    try {
      await saveDevice(uid, { token: token.data, tokenType: 'fcm' }, true);
    } catch {
      // será regravado no próximo login
    }
  });
  return () => subscription.remove();
}

/** No logout, desativa o token deste aparelho para que ele não receba pushes do usuário anterior. */
export async function disableCurrentDevice(uid: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    await updateDoc(doc(firestore, 'users', uid, 'devices', deviceId), {
      enabled: false,
      updatedAt: Date.now(),
    });
  } catch {
    // dispositivo ainda não registrado ou sem conexão
  }
}
