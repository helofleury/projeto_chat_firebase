import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string;
  name: string;
  photoUrl: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  createdAt: number;
  updatedAt: number;
};

export type GroupDoc = Omit<ChatGroup, 'id'>;

export type CreateGroupInput = {
  name: string;
  memberIds: string[]; // sem o proprietário (a API o inclui)
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
  photoUri: string | null;
};

export type GroupDetailsUpdate = {
  name?: string;
  photoUrl?: string;
  notificationPolicy?: NotificationPolicy;
};
