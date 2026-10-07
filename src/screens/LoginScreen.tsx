import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';
import { validateEmail } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    const emailError = validateEmail(email);
    if (emailError || password === '') {
      setError(emailError ?? 'Informe a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Chat Firebase</Text>
        <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="voce@exemplo.com"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Sua senha"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button title="Entrar" onPress={handleLogin} loading={loading} />
          <Button title="Criar conta" onPress={() => navigation.navigate('Register')} variant="secondary" disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: 'center', marginBottom: 24 },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
  actions: { gap: 10, marginTop: 8 },
});
