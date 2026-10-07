import { useEffect, useMemo, useState } from 'react';

import { useGroups } from './useGroups';
import { useUsers } from './useUsers';
import { subscribeDirectConversations } from '../services/chatService';
import type { ConversationListItem, DirectConversation } from '../types/chat';
import { getOtherParticipantId } from '../utils/conversationId';
import { getErrorMessage } from '../utils/errors';

function useDirectConversations(userId: string) {
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeDirectConversations(
      userId,
      (list) => {
        setConversations(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [userId]);

  return { conversations, loading, error };
}

/** Junta grupos e conversas individuais numa única lista ordenada. */
export function useConversationList(userId: string) {
  const groupsState = useGroups(userId);
  const directState = useDirectConversations(userId);
  const usersState = useUsers();

  const items = useMemo<ConversationListItem[]>(() => {
    const groupItems = groupsState.groups.map<ConversationListItem>((group) => ({
      id: group.id,
      type: 'group',
      title: group.name,
      subtitle: `Grupo · ${group.memberIds.length}/${group.memberLimit} integrantes`,
      photoUrl: group.photoUrl,
      sortKey: group.updatedAt,
    }));

    const directItems = directState.conversations.map<ConversationListItem>((conversation) => {
      const otherId = getOtherParticipantId(conversation.id, userId);
      const other = otherId ? usersState.usersById.get(otherId) : undefined;
      return {
        id: conversation.id,
        type: 'direct',
        title: other?.name ?? 'Usuário',
        subtitle: 'Conversa individual',
        photoUrl: other?.photoUrl ?? '',
        sortKey: conversation.createdAt,
      };
    });

    return [...groupItems, ...directItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [groupsState.groups, directState.conversations, usersState.usersById, userId]);

  return {
    items,
    loading: groupsState.loading || directState.loading,
    error: groupsState.error ?? directState.error ?? usersState.error,
  };
}
