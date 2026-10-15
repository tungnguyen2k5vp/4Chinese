import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Disclosure } from "@/components/chinese/Disclosure";
import { themedCard } from "@/constants/design";
import { vietnameseContrasts } from "@/data/vietnamese-contrasts";
import { listGrammarMicroLessons } from "@/db/grammar-focus";
import { useTheme } from "@/theme/ThemeProvider";

export default function GrammarFocus() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const live = useRef(false);
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof listGrammarMicroLessons>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listGrammarMicroLessons(db);
      if (live.current) setItems(rows);
    } catch {
      if (live.current) setError("Chưa đọc được lịch sử luyện ngữ pháp.");
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
      title="Ôn ngắn theo lỗi lặp lại"
      hideTitle
    >
      <Disclosure title="Cách chọn lỗi cần ôn"><Text style={{ color: theme.textMuted }}>
        Xét tối đa 2.000 lượt gần nhất trong 30 ngày. Cần ít nhất 5 lượt khác
        nhau, 3 lượt sai, 2 dạng bài; ba lượt đúng gần nhất sẽ ngừng gợi ý cấu
        trúc đó. Không thay lịch SRS từ vựng.
      </Text></Disclosure>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text style={{ color: theme.error }}>{error}</Text>
          <PrimaryButton label="Thử lại" onPress={() => void load()} />
        </>
      ) : null}
      {!loading && !error && !items.length ? (
        <Text style={{ color: theme.textSecondary }}>
          Chưa có lỗi lặp lại đủ dữ liệu để gợi ý. Bạn vẫn có thể chọn một bài
          đối chiếu dưới đây.
        </Text>
      ) : null}
      {items.map((item) => (
        <View key={item.grammarId} style={[themedCard(theme), { gap: 12 }]}>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 20,
              fontWeight: "800",
            }}
          >
            {item.seed.title}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            {item.wrong}/{item.samples} lượt cần sửa · {item.exerciseTypes} dạng
            bài trong mẫu gần đây.
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {item.seed.explanation}
          </Text>
          <PrimaryButton
            label="Ôn cấu trúc này"
            onPress={() =>
              router.push({
                pathname: "/grammar/[id]",
                params: { id: item.grammarId },
              } as unknown as Href)
            }
          />
        </View>
      ))}
      <Text
        style={{ color: theme.textPrimary, fontSize: 20, fontWeight: "800" }}
      >
        Người Việt hay nhầm
      </Text>
      {vietnameseContrasts.map((item) => (
        <PrimaryButton
          key={item.seed.id}
          label={item.seed.title.replace("Người Việt hay nhầm: ", "")}
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/grammar/[id]",
              params: { id: item.seed.id },
            } as unknown as Href)
          }
        />
      ))}
    </Screen>
  );
}
