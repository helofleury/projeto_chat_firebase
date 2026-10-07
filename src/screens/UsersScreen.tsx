import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { UserList } from '../components/UserList';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { ensureDirectConversation } from '../services/chatService';
import type { RootStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { users, loading, error } = useUsers();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // O próprio usuário nunca aparece (nem pode ser selecionado).
  const candidates = useMemo(() => users.filter((u) => u.uid !== user?.uid), [users, user?.uid]);

  const handleSelect = useCallback(
    async (target: PublicProfile) => {
      if (!user || target.uid === user.uid || starting) return;
      setStarting(true);
      setStartError(null);
      try {
        const conversationId = await ensureDirectConversation(target.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err) {
        setStartError(getErrorMessage(err));
        setStarting(false);
      }
    },
    [user, starting, navigation],
  );

  if (loading) return <Loading message="Carregando usuários..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <View style={styles.container}>
      {startError ? <ErrorMessage message={startError} /> : null}
      {starting ? <Loading message="Abrindo conversa..." /> : null}
      {!starting ? (
        <UserList users={candidates} onSelect={handleSelect} emptyMessage="Nenhum outro usuário cadastrado." />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
