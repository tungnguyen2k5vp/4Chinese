import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishPersonalWordCard } from "@/components/english/EnglishPersonalVocabulary";
import { setEnglishCardSuspended } from "@/db/english/decks";
import type { EnglishCard } from "@/db/english/learner";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useTheme } from "@/theme/ThemeProvider";

export default function SuspendedEnglishWords() {
  const db = useEnglishDatabase();
  const theme = useTheme();
  const [cards, setCards] = useState<EnglishCard[]>([]);
  const [after, setAfter] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setLoading(true);
      void db
        .getAllAsync<EnglishCard>(
          "SELECT c.* FROM en_cards c JOIN en_decks d ON d.id=c.deck_id WHERE d.deleted=0 AND c.suspended=1 AND c.id>? ORDER BY c.id LIMIT 26",
          after,
        )
        .then((rows) => {
          if (live) {
            setCards(rows.slice(0, 25));
            setNext(rows.length > 25 ? rows[24]!.id : null);
            setError("");
          }
        })
        .catch(() => {
          if (live) setError("Chưa tải được danh sách. Hãy thử lại.");
        })
        .finally(() => {
          if (live) setLoading(false);
        });
      return () => {
        live = false;
      };
    }, [db, after, refresh]),
  );
  const restore = async (card: EnglishCard) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await setEnglishCardSuspended(db, card.id, false);
      setRefresh((n) => n + 1);
    } catch {
      setError("Chưa khôi phục được từ. Hãy thử lại.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Các từ đã bỏ qua"
      subtitle="Khôi phục để tiếp tục học với cấp nhớ và lịch sử hiện có"
    >
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
          <PrimaryButton
            label="Thử lại danh sách"
            onPress={() => setRefresh((n) => n + 1)}
          />
        </>
      ) : null}
      {!loading && !cards.length ? (
        <Text style={{ color: theme.textPrimary }}>
          Chưa có từ nào được bỏ qua.
        </Text>
      ) : null}
      {cards.map((card) => (
        <EnglishPersonalWordCard
          key={card.id}
          card={card}
          busy={busy}
          onStart={() => undefined}
          onSuspend={() => void restore(card)}
        />
      ))}
      {next ? (
        <PrimaryButton
          label="Trang từ bỏ qua tiếp theo"
          onPress={() => setAfter(next)}
        />
      ) : null}
      {after ? (
        <PrimaryButton
          label="Về đầu danh sách"
          variant="secondary"
          onPress={() => setAfter("")}
        />
      ) : null}
    </Screen>
  );
}
