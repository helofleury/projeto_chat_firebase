import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageItem } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import { setActiveConversation } from '../services/notificationService';
import type { ChatMessage } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getOtherParticipantId } from '../utils/conversationId';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId, conversationType } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = user?.uid ?? '';
  const isGroup = conversationType === 'group';

  const { usersById } = useUsers();
  const { group, loading: groupLoading } = useGroup(isGroup ? conversationId : null);
  const chat = useChat(conversationId, conversationType, userId);

  // Evita banner de push da conversa que já está aberta.
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => setActiveConversation(null);
  }, [conversationId]);

  const otherUserId = useMemo(
    () => (isGroup ? null : getOtherParticipantId(conversationId, userId)),
    [isGroup, conversationId, userId],
  );
  const otherUser = otherUserId ? usersById.get(otherUserId) : undefined;

  const title = isGroup ? (group?.name ?? 'Grupo') : (otherUser?.name ?? 'Conversa');
  const photoUrl = isGroup ? group?.photoUrl : otherUser?.photoUrl;

  const removedFromGroup = isGroup && !groupLoading && (group === null || !group.memberIds.includes(userId));

  const mentionableMembers = useMemo<PublicProfile[]>(() => {
    if (!isGroup || !group) return [];
    return group.memberIds
      .filter((id) => id !== userId)
      .map((id) => usersById.get(id))
      .filter((profile): profile is PublicProfile => profile !== undefined);
  }, [isGroup, group, usersById, userId]);

  // Lista invertida: a mensagem mais recente fica sempre visível, sem rolagem manual.
  const invertedMessages = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  const handleHeaderPhoto = useCallback(() => {
    if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
    else if (otherUserId) navigation.navigate('Profile', { uid: otherUserId });
  }, [isGroup, conversationId, otherUserId, navigation]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId === userId;
      const targetName =
        item.target.type === 'member' ? (usersById.get(item.target.memberId)?.name ?? 'integrante') : undefined;
      return (
        <ChatMessageItem
          message={item}
          isMine={isMine}
          authorName={isGroup ? (usersById.get(item.senderId)?.name ?? 'Usuário') : undefined}
          targetName={targetName}
        />
      );
    },
    [userId, isGroup, usersById],
  );

  let body;
  if (chat.loading) {
    body = <Loading message="Carregando mensagens..." />;
  } else if (chat.error) {
    body = <ErrorMessage message={chat.error} onRetry={chat.reload} />;
  } else {
    body = (
      <FlatList
        data={invertedMessages}
        inverted
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={invertedMessages.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <EmptyState icon="chatbubble-outline" title="Nenhuma mensagem ainda" subtitle="Envie a primeira mensagem." />
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={26} color={colors.card} />
        </Pressable>
        <Avatar uri={photoUrl} isGroup={isGroup} size={40} onPress={handleHeaderPhoto} />
        <View style={styles.headerInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle}>{isGroup ? 'Toque na foto para ver os integrantes' : 'Toque na foto para ver o perfil'}</Text>
        </View>
      </View>

      <View style={styles.body}>{body}</View>

      {chat.sendError ? (
        <Pressable style={styles.banner} onPress={chat.dismissSendError}>
          <Text style={styles.bannerError}>{chat.sendError} (toque para fechar)</Text>
        </Pressable>
      ) : null}
      {chat.notifyWarning ? (
        <View style={styles.bannerWarn}>
          <Text style={styles.bannerWarnText}>{chat.notifyWarning}</Text>
        </View>
      ) : null}
      {removedFromGroup ? (
        <View style={styles.bannerWarn}>
          <Text style={styles.bannerWarnText}>Você não faz mais parte deste grupo.</Text>
        </View>
      ) : null}

      <View style={{ paddingBottom: insets.bottom }}>
        <ChatInput
          onSend={chat.sendMessage}
          sending={chat.sending}
          disabled={removedFromGroup || chat.error !== null}
          mentionableMembers={mentionableMembers}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerInfo: { flex: 1 },
  title: { color: colors.card, fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#bfdbfe', fontSize: 12 },
  body: { flex: 1 },
  list: { paddingVertical: 8 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', transform: [{ scaleY: -1 }] },
  banner: { backgroundColor: '#fee2e2', padding: 8 },
  bannerError: { color: colors.danger, textAlign: 'center', fontSize: 13 },
  bannerWarn: { backgroundColor: '#fef3c7', padding: 8 },
  bannerWarnText: { color: '#92400e', textAlign: 'center', fontSize: 13 },
});
