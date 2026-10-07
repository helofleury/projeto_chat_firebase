import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PolicyPicker } from '../components/PolicyPicker';
import { TextField } from '../components/TextField';
import { UserList } from '../components/UserList';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import {
  addGroupMember,
  createGroup,
  removeGroupMember,
  updateGroupDetails,
  updateMemberLimit,
  uploadGroupPhoto,
} from '../services/groupService';
import { pickImage } from '../services/imageService';
import type { RootStackParamList } from '../types/navigation';
import type { NotificationPolicy } from '../types/notification';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import {
  availableSlots,
  describeSlots,
  MIN_GROUP_MEMBERS,
  validateGroupName,
  validateMemberLimit,
} from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export function GroupFormScreen({ route, navigation }: Props) {
  const groupId = route.params?.groupId;
  const isEdit = groupId !== undefined;
  const { user } = useAuth();
  const { users, usersById, loading: usersLoading } = useUsers();
  const { group, loading: groupLoading, error: groupError } = useGroup(groupId ?? null);

  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preenche o formulário uma única vez com os dados do grupo (modo edição).
  useEffect(() => {
    if (group && !hydrated) {
      setName(group.name);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setHydrated(true);
    }
  }, [group, hydrated]);

  const currentMembers = isEdit ? (group?.memberIds.length ?? 0) : selectedIds.length + 1; // +1 = proprietário
  const limitValidation = useMemo(() => validateMemberLimit(limitText, currentMembers), [limitText, currentMembers]);
  const slots = limitValidation.valid ? availableSlots(limitValidation.value, currentMembers) : null;

  const candidates = useMemo(() => {
    const exclude = new Set<string>([user?.uid ?? '', ...(group?.memberIds ?? [])]);
    return users.filter((u) => !exclude.has(u.uid));
  }, [users, user?.uid, group?.memberIds]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const handleToggleSelect = useCallback(
    (profile: PublicProfile) => {
      setError(null);
      if (selectedIds.includes(profile.uid)) {
        setSelectedIds(selectedIds.filter((id) => id !== profile.uid));
        return;
      }
      if (slots !== null && slots <= 0) {
        setError('Grupo sem vagas: aumente o limite para adicionar mais integrantes.');
        return;
      }
      setSelectedIds([...selectedIds, profile.uid]);
    },
    [selectedIds, slots],
  );

  const handleCreate = useCallback(async () => {
    const nameError = validateGroupName(name);
    if (nameError) return setError(nameError);
    if (!limitValidation.valid) return setError(limitValidation.error);
    if (currentMembers < MIN_GROUP_MEMBERS) return setError('Selecione pelo menos um integrante além de você.');

    setBusy(true);
    setError(null);
    try {
      const id = await createGroup({
        name,
        memberIds: selectedIds,
        memberLimit: limitValidation.value,
        notificationPolicy: policy,
        photoUri,
      });
      navigation.replace('Chat', { conversationId: id, conversationType: 'group' });
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }, [name, limitValidation, currentMembers, selectedIds, policy, photoUri, navigation]);

  const handleSaveEdit = useCallback(async () => {
    if (!group || !groupId) return;
    const nameError = validateGroupName(name);
    if (nameError) return setError(nameError);
    if (!limitValidation.valid) return setError(limitValidation.error);

    setBusy(true);
    setError(null);
    try {
      const photoUrl = photoUri ? await uploadGroupPhoto(groupId, photoUri) : undefined;
      await updateGroupDetails(groupId, {
        name: name.trim(),
        notificationPolicy: policy,
        ...(photoUrl ? { photoUrl } : {}),
      });
      if (limitValidation.value !== group.memberLimit) {
        await updateMemberLimit(groupId, limitValidation.value);
      }
      navigation.goBack();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [group, groupId, name, limitValidation, policy, photoUri, navigation]);

  const handleAddMember = useCallback(
    async (profile: PublicProfile) => {
      if (!groupId) return;
      setBusy(true);
      setError(null);
      try {
        await addGroupMember(groupId, profile.uid);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setBusy(false);
      }
    },
    [groupId],
  );

  const handleRemoveMember = useCallback(
    (uid: string) => {
      if (!groupId) return;
      const target = usersById.get(uid)?.name ?? 'este integrante';
      Alert.alert('Remover integrante', `Remover ${target} do grupo?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            removeGroupMember(groupId, uid)
              .catch((err: unknown) => setError(getErrorMessage(err)))
              .finally(() => setBusy(false));
          },
        },
      ]);
    },
    [groupId, usersById],
  );

  if (usersLoading || (isEdit && groupLoading)) return <Loading />;
  if (isEdit && groupError) return <ErrorMessage message={groupError} />;
  if (isEdit && (!group || !user || group.ownerId !== user.uid)) {
    return <ErrorMessage message="Somente o proprietário pode editar o grupo." />;
  }

  const photoPreview = photoUri ?? group?.photoUrl;
  const fullGroup = slots !== null && slots <= 0;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.photo}>
          <Avatar uri={photoPreview} isGroup size={96} onPress={handlePickPhoto} />
          <Button title="Alterar foto do grupo" onPress={handlePickPhoto} variant="secondary" disabled={busy} />
        </View>

        <TextField label="Nome do grupo" value={name} onChangeText={setName} placeholder="Ex.: Turma 3ºA" maxLength={60} />
        <TextField
          label="Limite de integrantes (incluindo você)"
          value={limitText}
          onChangeText={setLimitText}
          keyboardType="number-pad"
          error={limitValidation.valid ? undefined : limitValidation.error}
        />
        {limitValidation.valid ? (
          <Text style={[styles.slots, fullGroup && styles.slotsFull]}>
            {describeSlots(limitValidation.value, currentMembers)}
          </Text>
        ) : null}

        <Text style={styles.section}>Notificações push</Text>
        <PolicyPicker value={policy} onChange={setPolicy} disabled={busy} />

        {isEdit && group ? (
          <>
            <Text style={styles.section}>Integrantes</Text>
            <View style={styles.block}>
              {group.memberIds.map((id) => (
                <GroupMemberItem
                  key={id}
                  profile={usersById.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '' }}
                  isOwner={id === group.ownerId}
                  isMe={id === user?.uid}
                  onPress={(uid) => navigation.navigate('Profile', { uid })}
                  onRemove={group.memberIds.length > MIN_GROUP_MEMBERS ? handleRemoveMember : undefined}
                />
              ))}
            </View>
            <Text style={styles.section}>Adicionar integrante</Text>
            {fullGroup ? <Text style={styles.slotsFull}>Grupo sem vagas. Aumente o limite para adicionar.</Text> : null}
            <View style={styles.block}>
              <UserList
                users={candidates}
                onSelect={handleAddMember}
                disabledIds={fullGroup || busy ? candidates.map((c) => c.uid) : []}
                embedded
                emptyMessage="Todos os usuários já estão no grupo."
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.section}>Integrantes ({selectedIds.length} selecionados)</Text>
            <View style={styles.block}>
              <UserList
                users={users.filter((u) => u.uid !== user?.uid)}
                onSelect={handleToggleSelect}
                selectedIds={selectedIds}
                embedded
                emptyMessage="Nenhum outro usuário cadastrado."
              />
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title={isEdit ? 'Salvar alterações' : 'Criar grupo'}
          onPress={isEdit ? handleSaveEdit : handleCreate}
          loading={busy}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 16, paddingBottom: 48 },
  photo: { alignItems: 'center', gap: 8, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  slots: { color: colors.success, marginBottom: 8, fontWeight: '600' },
  slotsFull: { color: colors.danger, fontWeight: '600', marginBottom: 8 },
  block: { borderRadius: 10, overflow: 'hidden', marginBottom: 16, backgroundColor: colors.card },
  error: { color: colors.danger, textAlign: 'center', marginBottom: 12 },
});
