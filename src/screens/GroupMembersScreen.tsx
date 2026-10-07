import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import { removeGroupMember } from '../services/groupService';
import type { RootStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { describeSlots } from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupMembers'>;

export function GroupMembersScreen({ route, navigation }: Props) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { group, loading, error } = useGroup(groupId);
  const { usersById } = useUsers();

  const handleLeave = useCallback(() => {
    if (!user) return;
    Alert.alert('Sair do grupo', 'Você deixará de receber as mensagens deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          removeGroupMember(groupId, user.uid)
            .then(() => navigation.popToTop())
            .catch((err: unknown) => Alert.alert('Erro', getErrorMessage(err)));
        },
      },
    ]);
  }, [user, groupId, navigation]);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!group || !user) return <ErrorMessage message="Grupo não encontrado ou você não é mais integrante." />;

  const isOwner = group.ownerId === user.uid;
  const members: PublicProfile[] = group.memberIds.map(
    (id) => usersById.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '' },
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Avatar uri={group.photoUrl} isGroup size={96} />
        <Text style={styles.name}>{group.name}</Text>
        <Text style={styles.slots}>{describeSlots(group.memberLimit, group.memberIds.length)}</Text>
      </View>
      <FlatList
        data={members}
        keyExtractor={(m) => m.uid}
        renderItem={({ item }) => (
          <GroupMemberItem
            profile={item}
            isOwner={item.uid === group.ownerId}
            isMe={item.uid === user.uid}
            onPress={(uid) => navigation.navigate('Profile', { uid })}
          />
        )}
      />
      <View style={styles.footer}>
        {isOwner ? (
          <Button title="Editar grupo" onPress={() => navigation.navigate('GroupForm', { groupId })} />
        ) : (
          <Button title="Sair do grupo" onPress={handleLeave} variant="danger" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { alignItems: 'center', padding: 20, gap: 6, backgroundColor: colors.card },
  name: { fontSize: 22, fontWeight: '700', color: colors.text },
  slots: { fontSize: 14, color: colors.muted },
  footer: { padding: 16 },
});
