import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { PublicProfile } from '../types/user';
import { colors } from '../utils/theme';

type Props = {
  onSend: (text: string, mentionedUserIds: string[]) => Promise<boolean>;
  sending: boolean;
  disabled?: boolean;
  /** Integrantes que podem ser mencionados (somente em grupos). */
  mentionableMembers?: PublicProfile[];
};

export function ChatInput({ onSend, sending, disabled = false, mentionableMembers = [] }: Props) {
  const [text, setText] = useState('');
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);

  const toggleMention = useCallback((uid: string) => {
    setMentionedIds((current) =>
      current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid],
    );
  }, []);

  const handleSend = useCallback(async () => {
    if (text.trim() === '' || sending || disabled) return;
    const ok = await onSend(text, mentionedIds);
    if (ok) {
      setText('');
      setMentionedIds([]);
    }
  }, [text, mentionedIds, sending, disabled, onSend]);

  const canSend = text.trim() !== '' && !sending && !disabled;

  return (
    <View style={styles.container}>
      {mentionableMembers.length > 0 ? (
        <View>
          <Text style={styles.hint}>Direcionar a (opcional):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {mentionableMembers.map((member) => {
              const selected = mentionedIds.includes(member.uid);
              return (
                <Pressable
                  key={member.uid}
                  onPress={() => toggleMention(member.uid)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>@{member.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={disabled ? 'Você não pode enviar mensagens' : 'Digite uma mensagem'}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={2000}
          editable={!disabled}
        />
        <Pressable onPress={handleSend} disabled={!canSend} style={[styles.send, !canSend && styles.sendDisabled]}>
          <Ionicons name="send" size={20} color={colors.card} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: 8, gap: 6 },
  hint: { fontSize: 12, color: colors.muted, marginLeft: 4, marginBottom: 2 },
  chips: { gap: 6, paddingHorizontal: 4 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.primary, fontSize: 13 },
  chipTextSelected: { color: colors.card },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
});
