import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../utils/theme';

type Props = {
  uri?: string;
  size?: number;
  isGroup?: boolean;
  onPress?: () => void;
};

/** Foto com imagem padrão quando a URL está vazia ou falha ao carregar. */
export function Avatar({ uri, size = 48, isGroup = false, onPress }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const radius = size / 2;
  const content =
    uri && !failed ? (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        onError={() => setFailed(true)}
      />
    ) : (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
        <Ionicons name={isGroup ? 'people' : 'person'} size={size * 0.55} color={colors.card} />
      </View>
    );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: '#9ca3af', alignItems: 'center', justifyContent: 'center' },
});
