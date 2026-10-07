import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors } from '../utils/theme';

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <Button title="Tentar novamente" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, alignItems: 'stretch' },
  text: { color: colors.danger, textAlign: 'center', fontSize: 15 },
});
