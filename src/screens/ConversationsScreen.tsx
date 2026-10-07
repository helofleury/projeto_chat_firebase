import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { useConversationList } from '../hooks/useConversations';
import type { ConversationListItem } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';
import type { PushRegistrationStatus } from '../types/notification';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>;

const PUSH_WARNINGS: Partial<Record<PushRegistrationStatus, string>> = {
  denied: 'Notificações negadas. Ative-as nas configurações do aparelho para receber mensagens.',
  no_token: 'Não foi possível obter o token de notificações deste aparelho.',
  unavailable: 'Notificações push exigem um dispositivo físico.',
  error: 'Falha ao registrar o aparelho para notificações.',
};

export function ConversationsScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { status, retryRegistration } = useNotificationStatus();
  const { items, loading, error } = useConversationList(user?.uid ?? '');

  const openConversation = useCallback(
    (item: ConversationListItem) =>
      navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type }),
    [navigation],
  );

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          signOut().catch((err: unknown) => Alert.alert('Erro', getErrorMessage(err)));
        },
      },
    ]);
  }, [signOut]);

  const pushWarning = PUSH_WARNINGS[status];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Conversas</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => navigation.navigate('Users')} accessibilityLabel="Nova conversa">
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={colors.card} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('GroupForm')} accessibilityLabel="Novo grupo">
            <Ionicons name="people-outline" size={26} color={colors.card} />
          </Pressable>
          <Pressable onPress={handleLogout} accessibilityLabel="Sair">
            <Ionicons name="log-out-outline" size={26} color={colors.card} />
          </Pressable>
        </View>
      </View>

      {pushWarning ? (
        <Pressable style={styles.warning} onPress={() => void retryRegistration()}>
          <Text style={styles.warningText}>{pushWarning} Toque para tentar novamente.</Text>
        </Pressable>
      ) : null}

      {loading ? (
        <Loading message="Carregando conversas..." />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}:${item.id}`}
          renderItem={({ item }) => <ConversationItem item={item} onPress={openConversation} />}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Nenhuma conversa ainda"
              subtitle="Toque nos ícones acima para iniciar uma conversa ou criar um grupo."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.card, fontSize: 22, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 18 },
  warning: { backgroundColor: '#fef3c7', padding: 10 },
  warningText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
});
