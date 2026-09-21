import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/design';

export function SearchBar({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.container}><Ionicons name="search" size={20} color={colors.textMuted} />
    <TextInput value={value} onChangeText={onChangeText} placeholder="Hanzi, pinyin, tiếng Việt..." placeholderTextColor={colors.textMuted}
      autoCapitalize="none" autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" style={styles.input} />
  </View>;
}

const styles = StyleSheet.create({ container: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md }, input: { flex: 1, minHeight: 48, color: colors.text, fontSize: 15 } });
