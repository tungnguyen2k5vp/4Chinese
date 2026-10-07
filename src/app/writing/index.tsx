import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { radius, spacing, themedCard } from "@/constants/design";
import { commonRadicals } from "@/data/common-radicals";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

export default function WritingIndexScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [query, setQuery] = useState("");
  const { lessonActivityId, returnTo } = useLocalSearchParams<{ lessonActivityId?: string; returnTo?: string }>();
  const radicals = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    if (!normalized) return commonRadicals;
    return commonRadicals.filter((radical) =>
      [radical.character, radical.name, radical.meaningVi, radical.usage, ...radical.examples]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(normalized),
    );
  }, [query]);

  return (
    <Screen
      subtitle="Làm quen với hình dạng, nghĩa và cách bộ thủ tạo gợi ý cho chữ Hán."
      title="Luyện viết bộ thủ"
    >
      <View style={[themedCard(theme), styles.hero]}>
        <View style={styles.heroIcon}>
          <Ionicons color={theme.primary} name="brush" size={26} />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>50 bộ thủ thông dụng</Text>
          <Text style={styles.heroText}>
            Chọn một bộ để xem nghĩa, cách dùng, từ gợi ý và luyện viết theo nét.
          </Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons color={theme.textMuted} name="search" size={20} />
        <TextInput
          accessibilityLabel="Tìm bộ thủ"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Tìm: nước, tay, 口, 木..."
          placeholderTextColor={theme.textMuted}
          style={styles.searchInput}
          value={query}
        />
      </View>

      <View style={styles.headingRow}>
        <Text style={styles.heading}>Danh sách bộ thủ</Text>
        <Text style={styles.count}>{radicals.length}/50</Text>
      </View>
      <View style={styles.grid}>
        {radicals.map((radical) => (
          <Pressable
            accessibilityLabel={`Luyện bộ ${radical.character}, ${radical.name}`}
          accessibilityRole="button"
          accessibilityHint={`Mở hướng dẫn và bài luyện viết bộ ${radical.character}.`}
            key={radical.character}
            onPress={() =>
              router.push({
                pathname: "/writing/[character]",
                params: { character: radical.character, lessonActivityId: lessonActivityId ?? "", returnTo: returnTo ?? "" },
              })
            }
            style={({ pressed }) => [styles.radicalCard, pressed && styles.pressed]}
          >
            <Text style={styles.radical}>{radical.character}</Text>
            <Text numberOfLines={1} style={styles.name}>{radical.name}</Text>
            <Text numberOfLines={1} style={styles.meaning}>{radical.meaningVi}</Text>
          </Pressable>
        ))}
      </View>
      {radicals.length === 0 ? (
        <Text style={styles.empty}>Chưa tìm thấy bộ thủ phù hợp.</Text>
      ) : null}
    </Screen>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    hero: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: theme.primarySoft },
    heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface },
    heroCopy: { flex: 1, gap: 3 },
    heroTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: "900" },
    heroText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    searchBox: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.surface, paddingHorizontal: spacing.md },
    searchInput: { flex: 1, color: theme.textPrimary, fontSize: 15 },
    headingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    heading: { color: theme.textPrimary, fontSize: 19, fontWeight: "900" },
    count: { color: theme.primaryText, fontSize: 13, fontWeight: "900" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    radicalCard: { width: "31%", minHeight: 126, flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 3, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.surface, padding: spacing.sm },
    radical: { color: theme.textPrimary, fontSize: 39, fontWeight: "900" },
    name: { color: theme.primaryText, fontSize: 12, fontWeight: "900" },
    meaning: { color: theme.textMuted, fontSize: 11 },
    pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
    empty: { color: theme.textMuted, textAlign: "center", paddingVertical: spacing.xl },
  });
}
