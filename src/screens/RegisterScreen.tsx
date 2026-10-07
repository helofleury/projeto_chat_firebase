import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { pickImage } from '../services/imageService';
import type { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';
import {
  maskBirthDate,
  onlyDigits,
  parseBirthDate,
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type FieldName = 'name' | 'email' | 'phone' | 'birthDate' | 'password' | 'confirm';
type FieldErrors = Partial<Record<FieldName, string>>;

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = useCallback(async () => {
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  const handleRegister = useCallback(async () => {
    const parsedBirth = parseBirthDate(birthDate);
    const errors: FieldErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      phone: validatePhone(phone) ?? undefined,
      birthDate: parsedBirth ? undefined : 'Informe uma data válida (DD/MM/AAAA).',
      password: validatePassword(password) ?? undefined,
      confirm: confirm === password ? undefined : 'As senhas não conferem.',
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean) || !parsedBirth) return;

    setLoading(true);
    setError(null);
    try {
      await signUp({
        name,
        email,
        password,
        phoneNumber: onlyDigits(phone),
        birthDate: parsedBirth,
        photoUri,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [name, email, phone, birthDate, password, confirm, photoUri, signUp]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.photo}>
          <Avatar uri={photoUri ?? undefined} size={96} onPress={handlePickPhoto} />
          <Button title={photoUri ? 'Trocar foto' : 'Escolher foto de perfil'} onPress={handlePickPhoto} variant="secondary" />
        </View>
        <TextField label="Nome" value={name} onChangeText={setName} error={fieldErrors.name} placeholder="Seu nome completo" />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="voce@exemplo.com"
        />
        <TextField
          label="Celular"
          value={phone}
          onChangeText={setPhone}
          error={fieldErrors.phone}
          keyboardType="phone-pad"
          placeholder="11999998888"
        />
        <TextField
          label="Data de nascimento"
          value={birthDate}
          onChangeText={(text) => setBirthDate(maskBirthDate(text))}
          error={fieldErrors.birthDate}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />
        <TextField
          label="Senha"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Mínimo 6 caracteres"
        />
        <TextField
          label="Confirmar senha"
          value={confirm}
          onChangeText={setConfirm}
          error={fieldErrors.confirm}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Repita a senha"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Button title="Criar conta" onPress={handleRegister} loading={loading} />
          <Button title="Já tenho conta" onPress={() => navigation.goBack()} variant="secondary" disabled={loading} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 48 },
  photo: { alignItems: 'center', gap: 8, marginBottom: 16 },
  error: { color: colors.danger, marginBottom: 12, textAlign: 'center' },
  actions: { gap: 10, marginTop: 8 },
});
