import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/theme';

export function Loading({ message }: { message?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  message: { marginTop: 12, color: colors.muted },
});
