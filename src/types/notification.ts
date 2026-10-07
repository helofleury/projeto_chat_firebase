import type { ConversationType } from './chat';

export type NotificationPolicy =
  | 'all_group_messages'
  | 'mentioned_members'
  | 'direct_messages_only'
  | 'disabled';

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DevicePlatform = 'ios' | 'android';
export type PushTokenType = 'fcm' | 'expo';

export type DeviceRecord = {
  token: string;
  tokenType: PushTokenType;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

export type NotificationRoute = {
  conversationId: string;
  conversationType: ConversationType;
};

export type PushRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'denied'
  | 'unavailable'
  | 'no_token'
  | 'error';
