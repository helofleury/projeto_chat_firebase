import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ChatMessage } from '../types/chat';
import { colors } from '../utils/theme';
import { formatTime } from '../utils/validation';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  /** Nome do autor (exibido em mensagens de grupo recebidas). */
  authorName?: string;
  /** Nome do integrante a quem a mensagem foi direcionada. */
  targetName?: string;
};

function ChatMessageItemBase({ message, isMine, authorName, targetName }: Props) {
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {!isMine && authorName ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? (
          <Text style={[styles.target, isMine && styles.textMineSoft]}>Para @{targetName}</Text>
        ) : null}
        <Text style={[styles.text, isMine && styles.textMine]}>{message.text}</Text>
        <Text style={[styles.time, isMine && styles.textMineSoft]}>{formatTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

export const ChatMessageItem = memo(ChatMessageItemBase);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderBottomLeftRadius: 4 },
  author: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  target: { fontSize: 12, fontStyle: 'italic', color: colors.muted, marginBottom: 2 },
  text: { fontSize: 16, color: colors.text },
  textMine: { color: colors.card },
  textMineSoft: { color: '#dbeafe' },
  time: { fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 },
});
