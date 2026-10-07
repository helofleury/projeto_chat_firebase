import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  profile: PublicProfile;
  isOwner: boolean;
  isMe: boolean;
  onPress: (uid: string) => void;
  /** Quando informado, exibe o botão de remover (somente para o proprietário). */
  onRemove?: (uid: string) => void;
};

export function GroupMemberItem({ profile, isOwner, isMe, onPress, onRemove }: Props) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} onPress={() => onPress(profile.uid)}>
        <Avatar uri={profile.photoUrl} size={44} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.name}
            {isMe ? ' (você)' : ''}
          </Text>
          {isOwner ? <Text style={styles.badge}>Proprietário</Text> : null}
        </View>
      </Pressable>
      {onRemove && !isOwner ? (
        <Pressable onPress={() => onRemove(profile.uid)} hitSlop={8} accessibilityLabel={`Remover ${profile.name}`}>
          <Ionicons name="remove-circle" size={26} color={colors.danger} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, color: colors.text, fontWeight: '500' },
  badge: { fontSize: 12, color: colors.primary, fontWeight: '600' },
});
