import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  listDeletedPersonalDecks,
  restorePersonalDeck,
} from "@/db/repository";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { PersonalDeck } from "@/types/models";

export default function DeckTrash() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(() => {
    void listDeletedPersonalDecks(db).then(setDecks);
  }, [db]);
  useFocusEffect(load);

  const restore = async (deck: PersonalDeck) => {
    if (restoringId) return;
    setRestoringId(deck.id);
    try {
      await restorePersonalDeck(db, deck.id);
      setDecks((current) => current.filter((item) => item.id !== deck.id));
    } catch {
      Alert.alert("Chưa thể khôi phục", "Vui lòng thử lại sau.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Screen
      title="Thùng rác"
      subtitle="Bộ từ bị xóa mềm sẽ nằm ở đây. Khôi phục để tiếp tục học, các từ và lịch ôn vẫn được giữ nguyên."
    >
      {decks.length ? (
        decks.map((deck) => (
          <View key={deck.id} style={[themedCard(theme), styles.deck]}>
            <View style={[styles.icon, { backgroundColor: `${deck.color}18` }]}>
              <Ionicons name="trash-outline" size={24} color={deck.color} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.name}>{deck.name}</Text>
              <Text style={styles.meta}>
                {deck.wordCount} từ · Đã xóa {formatDate(deck.deletedAt)}
              </Text>
            </View>
            <PrimaryButton
              variant="secondary"
              icon="↩"
              label="Khôi phục"
              loading={restoringId === deck.id}
              disabled={restoringId !== null && restoringId !== deck.id}
              onPress={() => void restore(deck)}
              style={styles.restoreButton}
            />
          </View>
        ))
      ) : (
        <EmptyState
          icon="♻"
          variant="vocabulary"
          scene="history"
          title="Thùng rác đang trống"
          message="Khi bạn đưa một bộ từ vào thùng rác, bộ đó sẽ xuất hiện ở đây để khôi phục."
        />
      )}
      <PrimaryButton
        variant="ghost"
        label="Quay lại bộ từ"
        onPress={() => router.back()}
      />
    </Screen>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "hôm nay";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "gần đây";
  return date.toLocaleDateString("vi-VN");
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  deck: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: "800", color: theme.textPrimary },
  meta: { fontSize: 12, color: theme.textMuted },
  restoreButton: { minHeight: 42, paddingHorizontal: spacing.md },
}); }
