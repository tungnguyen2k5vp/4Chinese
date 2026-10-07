import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { themedCard } from "@/constants/design";
import { confusablePairs } from "@/data/confusable-words";
import {
  listConfusableStats,
  type ConfusableStats,
} from "@/db/confusable-words";
import { useTheme } from "@/theme/ThemeProvider";

export default function ConfusableCenter() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [stats, setStats] = useState<ConfusableStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const live = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const rows = await listConfusableStats(db);
      if (live.current) setStats(rows);
    } catch {
      if (live.current) setError(true);
    } finally {
      if (live.current) setLoading(false);
    }
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      live.current = true;
      void load();
      return () => {
        live.current = false;
      };
    }, [load]),
  );
  return (
    <Screen
      title="Từ dễ nhầm"
      subtitle="Phân biệt theo tình huống, không học bằng một nghĩa Việt duy nhất."
    >
      <Text style={{ color: theme.textMuted }}>
        6 cặp · 12 câu gốc · nội dung biên soạn, chưa được thẩm định độc lập.
        Không phải danh sách HSK chính thức.
      </Text>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text style={{ color: theme.error }}>
            Chưa tải được lịch sử. Các bài vẫn có thể mở offline.
          </Text>
          <PrimaryButton label="Thử tải lại" onPress={() => void load()} />
        </>
      ) : null}
      {confusablePairs.map((pair) => {
        const progress = stats.find((item) => item.pair_id === pair.id);
        const first = pair.words[0];
        const second = pair.words[1];
        return (
          <View key={pair.id} style={[themedCard(theme), { gap: 12 }]}>
            <Text
              style={{
                color: theme.textPrimary,
                fontWeight: "800",
                fontSize: 24,
              }}
            >
              {pair.title}
            </Text>
            <View accessibilityLabel={`${pair.words[0]?.hanzi} so với ${pair.words[1]?.hanzi}`} style={{ flexDirection: 'row', alignItems: 'stretch', gap: 8 }}>
              {first ? <View style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, padding: 10, backgroundColor: theme.primarySoft }}>
                <Text style={{ color: theme.textPrimary, fontSize: 34, fontWeight: '900' }}>{first.hanzi}</Text>
                <Text style={{ color: theme.primaryText, fontWeight: '800' }}>{first.pinyin}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>{first.meaning}</Text>
              </View> : null}
              <View style={{ alignSelf: 'center', paddingHorizontal: 2 }}><Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '900' }}>VS</Text></View>
              {second ? <View style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 16, padding: 10, backgroundColor: theme.infoSoft }}>
                <Text style={{ color: theme.textPrimary, fontSize: 34, fontWeight: '900' }}>{second.hanzi}</Text>
                <Text style={{ color: theme.primaryText, fontWeight: '800' }}>{second.pinyin}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, textAlign: 'center' }}>{second.meaning}</Text>
              </View> : null}
            </View>
            {progress ? (
              <Text style={{ color: theme.textMuted }}>
                Đã luyện {progress.attempts} câu · đúng {progress.correct}. Có
                thể gồm lượt đã xem giải thích; không phải mức thành thạo.
              </Text>
            ) : null}
            <PrimaryButton
              label={`Luyện ${pair.title}`}
              onPress={() =>
                router.push({
                  pathname: "/confusables/[id]",
                  params: { id: pair.id },
                } as unknown as Href)
              }
            />
          </View>
        );
      })}
      <PrimaryButton
        label="Xem lỗi đã ghi nhận"
        variant="secondary"
        onPress={() => router.push("/mistakes" as Href)}
      />
    </Screen>
  );
}
