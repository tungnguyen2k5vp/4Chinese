import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { AnimatedProgressBar } from "@/components/ui/AnimatedProgressBar";
import { themedCard } from "@/constants/design";
import { getHskPreparation } from "@/db/hsk-preparation";
import { preparationConfidence } from '@/services/hsk/release-gates';
import { useTheme } from "@/theme/ThemeProvider";

export default function HskPreparation() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const live = useRef(false);
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof getHskPreparation>>
  >([]);
  const [level, setLevel] = useState("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHskPreparation(db);
      if (live.current) setRows(data);
    } catch {
      if (live.current)
        setError("Chưa tải được các chỉ số học. Không có dữ liệu bị xóa.");
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
  const selected = rows.find((row) => row.level === level);
  return (
    <Screen
      title="Mức độ chuẩn bị"
      subtitle="Các chỉ số trong app — không quy đổi thành điểm hoặc xác suất đỗ HSK."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {["1", "2", "3", "4", "5", "6", "7-9"].map((band) => (
          <Pressable
            key={band}
            accessibilityRole="tab"
            aria-selected={level === band}
            accessibilityState={{ selected: level === band }}
            onPress={() => setLevel(band)}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 12,
              backgroundColor: band === level ? theme.primary : theme.surface,
            }}
          >
            <Text
              style={{
                color: band === level ? theme.onPrimary : theme.textPrimary,
              }}
            >
              {band}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text style={{ color: theme.error }}>{error}</Text>
          <PrimaryButton label="Thử lại" onPress={() => void load()} />
        </>
      ) : null}
      {selected && !loading && !error ? (
        <View style={[themedCard(theme), { gap: 14 }]}>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 22,
              fontWeight: "800",
            }}
          >
            HSK {level} · tiến độ trong ứng dụng
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 0.7 }}>TIẾN ĐỘ HỌC TRONG ỨNG DỤNG</Text>
          <ReadinessBar label="Từ vựng đã học" value={selected.vocabulary.studied} total={selected.vocabulary.available} color={theme.skillColors.vocabulary} />
          <ReadinessBar label="Nhớ tốt theo SRS" value={selected.vocabulary.remembered} total={selected.vocabulary.studied} color={theme.success} denominatorLabel="từ đã học" />
          <ReadinessBar label="Ngữ pháp đã luyện" value={selected.grammar.practiced} total={selected.grammar.available} color={theme.skillColors.grammar} />
          <View style={{ gap: 5 }}>
            <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>Mini test gần đây</Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 21 }}>{selected.submittedMiniTests} bài đã nộp · {selected.recentMiniTests} bài trong tối đa 30 bài gần đây.</Text>
            {selected.recentQuestions > 0 ? <><AnimatedProgressBar progress={selected.recentCorrect / selected.recentQuestions} color={theme.skillColors.exam} trackColor={theme.border} accessibilityLabel={`Đúng ${selected.recentCorrect} trên ${selected.recentQuestions} câu gần đây`} /><Text style={{ color: theme.textMuted, fontSize: 12 }}>{selected.recentCorrect}/{selected.recentQuestions} câu đúng · kết quả luyện tập trong ứng dụng.</Text></> : <Text style={{ color: theme.textMuted, fontSize: 12 }}>Chưa có câu trả lời để tính tỉ lệ.</Text>}
          </View>
          <Text style={{ color: theme.textSecondary }}>
            Viết/dịch: {selected.recentSelfReviewedWriting} bài tự đối chiếu
            trong tối đa 30 bài viết gần nhất. Không phải điểm viết.
          </Text>
          <Text style={{color:theme.textMuted}}>
            {preparationConfidence(selected.recentQuestions,selected.recentMiniTests).label}
          </Text>
          <Text style={{ color: theme.textMuted }}>
            Chưa thể xác định ứng dụng bao phủ những phần nào của HSK vì danh mục âm tiết, Hán tự, từ vựng và ngữ pháp chuẩn chưa được đối chiếu đầy đủ.
          </Text>
          <Text style={{ color: theme.textMuted }}>
            Nghe, nói, viết và dịch theo cấu trúc thi: chưa đủ dữ liệu đánh giá.
            TTS không phải bản ghi người bản ngữ; tự đối chiếu không phải chấm
            phát âm.
          </Text>
          <Text style={{ color: theme.primaryText, fontWeight: "800" }}>
            Chưa thể gắn nhãn “HSK Exam Ready” cho cấp này.
          </Text>
        </View>
      ) : null}
      <PrimaryButton
        label="Luyện mini test"
        onPress={() => router.push("/exam" as Href)}
      />
      <PrimaryButton
        label="Ôn lỗi ngữ pháp lặp lại"
        variant="secondary"
        onPress={() => router.push("/grammar/focus" as Href)}
      />
      <PrimaryButton
        label="Luyện viết và dịch"
        variant="secondary"
        onPress={() => router.push("/exam/skills" as Href)}
      />
    </Screen>
  );
}

function ReadinessBar({ label, value, total, color, denominatorLabel = 'mục' }: { label: string; value: number; total: number; color: string; denominatorLabel?: string }) {
  const theme = useTheme();
  const safeTotal = Math.max(0, total);
  const safeValue = Math.max(0, Math.min(safeTotal, value));
  return <View style={{ gap: 6 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '700', flex: 1 }}>{label}</Text>
      <Text style={{ color: theme.textMuted, fontSize: 12 }}>{safeValue}/{safeTotal} {denominatorLabel}</Text>
    </View>
    {safeTotal > 0 ? <AnimatedProgressBar progress={safeValue / safeTotal} color={color} trackColor={theme.border} accessibilityLabel={`${label}: ${safeValue} trên ${safeTotal} ${denominatorLabel}`} /> : <Text style={{ color: theme.textMuted, fontSize: 12 }}>Chưa có dữ liệu để tính tỉ lệ.</Text>}
  </View>;
}
