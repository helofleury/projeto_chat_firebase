import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { getFullProfile, getPublicProfile } from '../services/userService';
import type { RootStackParamList } from '../types/navigation';
import type { ChatUser, PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';
import { formatBirthDate, formatPhone } from '../utils/validation';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const UNAVAILABLE = 'Indisponível';

export function ProfileScreen({ route }: Props) {
  const { uid } = route.params;
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);
  const [fullProfile, setFullProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const basic = await getPublicProfile(uid);
        if (cancelled) return;
        setPublicProfile(basic);
        // Dados cadastrais completos só são liberados a quem compartilha conversa/grupo.
        try {
          const full = await getFullProfile(uid);
          if (!cancelled) setFullProfile(full);
        } catch {
          if (!cancelled) setFullProfile(null);
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) return <Loading message="Carregando perfil..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!publicProfile) return <ErrorMessage message="Perfil não encontrado." />;

  const fields: { label: string; value: string }[] = [
    { label: 'E-mail', value: fullProfile?.email || UNAVAILABLE },
    { label: 'Celular', value: fullProfile?.phoneNumber ? formatPhone(fullProfile.phoneNumber) : UNAVAILABLE },
    { label: 'Data de nascimento', value: fullProfile?.birthDate ? formatBirthDate(fullProfile.birthDate) : UNAVAILABLE },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar uri={publicProfile.photoUrl} size={120} />
      <Text style={styles.name}>{publicProfile.name}</Text>
      <View style={styles.card}>
        {fields.map((field) => (
          <View key={field.label} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <Text style={[styles.value, field.value === UNAVAILABLE && styles.unavailable]}>{field.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, gap: 12, backgroundColor: colors.background, flexGrow: 1 },
  name: { fontSize: 24, fontWeight: '700', color: colors.text },
  card: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: 12, padding: 16, gap: 14, marginTop: 8 },
  field: { gap: 2 },
  label: { fontSize: 13, color: colors.muted },
  value: { fontSize: 17, color: colors.text },
  unavailable: { color: colors.muted, fontStyle: 'italic' },
});
