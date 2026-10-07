import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View } from "react-native";

import { radius, spacing } from "@/constants/design";
import { useTheme } from "@/theme/ThemeProvider";

export function SearchBar({ value, onChangeText, placeholder = "Hanzi, pinyin, tiếng Việt..." }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  const theme = useTheme();
  const styles = createStyles(theme);
  return <View style={styles.container}>
    <Ionicons name="search" size={20} color={theme.textMuted} />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      accessibilityLabel="Tìm trong kho từ"
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
      returnKeyType="search"
      style={styles.input}
    />
  </View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: spacing.md },
    input: { flex: 1, minHeight: 48, color: theme.textPrimary, fontSize: 15 },
  });
}
