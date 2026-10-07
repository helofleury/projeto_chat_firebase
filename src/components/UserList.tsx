import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  users: PublicProfile[];
  onSelect: (user: PublicProfile) => void;
  selectedIds?: string[];
  /** Usuários que não podem ser selecionados (ex.: grupo sem vagas). */
  disabledIds?: string[];
  /** Renderiza sem FlatList (para uso dentro de um ScrollView). */
  embedded?: boolean;
  emptyMessage?: string;
};

export function UserList({
  users,
  onSelect,
  selectedIds = [],
  disabledIds = [],
  embedded = false,
  emptyMessage = 'Nenhum usuário encontrado.',
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (term === '') return users;
    return users.filter((u) => u.name.toLocaleLowerCase('pt-BR').includes(term));
  }, [users, search]);

  const renderItem = (user: PublicProfile) => {
    const selected = selectedIds.includes(user.uid);
    const disabled = disabledIds.includes(user.uid);
    return (
      <Pressable
        key={user.uid}
        onPress={() => onSelect(user)}
        disabled={disabled}
        style={[styles.row, disabled && styles.rowDisabled]}
      >
        <Avatar uri={user.photoUrl} size={44} />
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        {selected ? <Ionicons name="checkmark-circle" size={24} color={colors.primary} /> : null}
      </Pressable>
    );
  };

  const empty = <EmptyState icon="people-outline" title={emptyMessage} />;

  return (
    <View style={embedded ? undefined : styles.flex}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar usuário por nome"
        placeholderTextColor={colors.muted}
        autoCorrect={false}
      />
      {embedded ? (
        filtered.length === 0 ? empty : <View>{filtered.map(renderItem)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          renderItem={({ item }) => renderItem(item)}
          ListEmptyComponent={empty}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    margin: 12,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowDisabled: { opacity: 0.45 },
  name: { flex: 1, fontSize: 16, color: colors.text },
});
