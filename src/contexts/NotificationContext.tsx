import { createContext, useContext, type ReactNode } from 'react';

import { useNotifications, type NotificationsState } from '../hooks/useNotifications';

const NotificationContext = createContext<NotificationsState>({
  status: 'idle',
  retryRegistration: async () => undefined,
});

export function NotificationProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const state = useNotifications(userId);
  return <NotificationContext.Provider value={state}>{children}</NotificationContext.Provider>;
}

export function useNotificationStatus(): NotificationsState {
  return useContext(NotificationContext);
}
