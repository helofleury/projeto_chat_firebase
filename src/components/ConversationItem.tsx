import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import type { ConversationListItem } from '../types/chat';
import { colors } from '../utils/theme';

type Props = {
  item: ConversationListItem;
  onPress: (item: ConversationListItem) => void;
};

export function ConversationItem({ item, onPress }: Props) {
  const isGroup = item.type === 'group';
  return (
    <Pressable onPress={() => onPress(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar uri={item.photoUrl} isGroup={isGroup} size={52} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.subtitleRow}>
          <Ionicons name={isGroup ? 'people-outline' : 'person-outline'} size={14} color={colors.muted} />
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { backgroundColor: '#eef2ff' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subtitle: { fontSize: 13, color: colors.muted },
});
