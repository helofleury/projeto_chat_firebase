import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { NotificationPolicy } from '../types/notification';
import { colors } from '../utils/theme';

export const POLICY_OPTIONS: { value: NotificationPolicy; title: string; description: string }[] = [
  {
    value: 'all_group_messages',
    title: 'Todas as mensagens do grupo',
    description: 'Todos os integrantes (exceto o remetente) recebem push.',
  },
  {
    value: 'mentioned_members',
    title: 'Somente mencionados',
    description: 'Apenas integrantes mencionados ou selecionados recebem push.',
  },
  {
    value: 'direct_messages_only',
    title: 'Somente conversas individuais',
    description: 'Mensagens de grupo não geram push.',
  },
  {
    value: 'disabled',
    title: 'Desativadas',
    description: 'Nenhuma mensagem deste grupo gera push.',
  },
];

type Props = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicyPicker({ value, onChange, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      {POLICY_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={[styles.option, selected && styles.optionSelected, disabled && styles.disabled]}
          >
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={selected ? colors.primary : colors.muted}
            />
            <View style={styles.texts}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, marginBottom: 12 },
  option: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#eff6ff' },
  disabled: { opacity: 0.6 },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  description: { fontSize: 13, color: colors.muted },
});
