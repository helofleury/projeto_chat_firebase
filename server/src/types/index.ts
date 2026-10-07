export const NOTIFICATION_POLICIES = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
] as const;

export type NotificationPolicy = (typeof NOTIFICATION_POLICIES)[number];
export type ConversationType = 'direct' | 'group';
export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };
export type TokenType = 'fcm' | 'expo';

export type StoredMessage = {
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type GroupDoc = {
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type DeviceDoc = {
  token: string;
  tokenType: TokenType;
  platform: 'ios' | 'android';
  enabled: boolean;
  updatedAt: number;
};

export type ConversationContext =
  | { type: 'direct'; participantIds: string[] }
  | { type: 'group'; participantIds: string[]; policy: NotificationPolicy; name: string };
