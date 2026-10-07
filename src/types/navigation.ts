import type { ConversationType } from './chat';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: undefined;
  GroupForm: { groupId?: string } | undefined;
  GroupMembers: { groupId: string };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
};
