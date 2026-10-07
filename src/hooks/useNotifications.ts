import { StackActions } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';

import { navigationRef } from '../navigation/navigationRef';
import {
  listenTokenRefresh,
  parseNotificationRoute,
  registerDeviceForPush,
} from '../services/notificationService';
import type { NotificationRoute, PushRegistrationStatus } from '../types/notification';

export type NotificationsState = {
  status: PushRegistrationStatus;
  retryRegistration: () => Promise<void>;
};

/**
 * Registra o aparelho para push (permissão + token no Firestore) e trata o
 * toque nas notificações, abrindo a conversa correspondente.
 */
export function useNotifications(userId: string | null): NotificationsState {
  const [status, setStatus] = useState<PushRegistrationStatus>('idle');
  const [pendingRoute, setPendingRoute] = useState<NotificationRoute | null>(null);

  const retryRegistration = useCallback(async () => {
    if (!userId) return;
    setStatus('registering');
    setStatus(await registerDeviceForPush(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setStatus('idle');
      return undefined;
    }
    void retryRegistration();
    return listenTokenRefresh(userId);
  }, [userId, retryRegistration]);

  // Toque em notificação (app em segundo plano) e abertura a partir do estado "fechado".
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = parseNotificationRoute(response);
      if (route) setPendingRoute(route);
    });
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return;
      const route = parseNotificationRoute(response);
      if (route) setPendingRoute(route);
    });
    return () => subscription.remove();
  }, []);

  // Só navega quando há usuário autenticado e o navegador está pronto.
  useEffect(() => {
    if (!userId || !pendingRoute) return undefined;

    const tryNavigate = (): boolean => {
      if (!navigationRef.isReady()) return false;
      navigationRef.dispatch(StackActions.push('Chat', pendingRoute));
      setPendingRoute(null);
      return true;
    };

    if (tryNavigate()) return undefined;
    const timer = setInterval(() => {
      if (tryNavigate()) clearInterval(timer);
    }, 300);
    return () => clearInterval(timer);
  }, [userId, pendingRoute]);

  return { status, retryRegistration };
}
