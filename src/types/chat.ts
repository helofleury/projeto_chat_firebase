export type ConversationType = 'direct' | 'group';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

/** Formato gravado no Firestore (directConversations/{id}). */
export type DirectConversationDoc = {
  participantIds: [string, string];
  createdAt: number;
};

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  photoUrl: string;
  sortKey: number;
};

export type SendMessageInput = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  mentionedUserIds: string[];
};
