import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { themedCard } from "@/constants/design";
import { writtenExercises } from "@/data/written-practice";
import {
  listWrittenAttempts,
  openWrittenDraft,
  type WrittenAttempt,
} from "@/db/written-practice";
import { writtenSnapshotTitle } from '@/services/exam/written-practice';
import { useTheme } from "@/theme/ThemeProvider";

export default function WrittenCenter() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [kind, setKind] = useState<"WRITING" | "TRANSLATION">("WRITING");
  const [attempts, setAttempts] = useState<WrittenAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setLoading(true);
      void listWrittenAttempts(db)
        .then((rows) => {
          if (live) setAttempts(rows);
        })
        .catch(() => {
          if (live) setError("Chưa đọc được các bản nháp.");
        })
        .finally(() => {
          if (live) setLoading(false);
        });
      return () => {
        live = false;
      };
    }, [db]),
  );
  const open = (id: string) =>
    router.push({
      pathname: "/exam/written",
      params: { id },
    } as unknown as Href);
  return (
    <Screen
      title="Luyện viết và dịch"
      subtitle="Bài tự biên soạn · kiểm tra cơ bản offline, không chấm điểm thi chính thức."
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(
          [
            { id: "WRITING", label: "Viết câu và đoạn" },
            { id: "TRANSLATION", label: "Luyện dịch" },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            aria-selected={kind === item.id}
            accessibilityState={{ selected: kind === item.id }}
            onPress={() => setKind(item.id)}
            style={{
              padding: 14,
              minHeight: 48,
              borderRadius: 16,
              backgroundColor: kind === item.id ? theme.primary : theme.surface,
            }}
          >
            <Text
              style={{
                color: kind === item.id ? theme.onPrimary : theme.textPrimary,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: theme.textMuted }}>
        Cấp độ là ước lượng dạy học. Nội dung chưa được kiểm chứng độc lập theo
        syllabus.
      </Text>
      <PrimaryButton
        label="Luyện nói · chuẩn bị và ghi âm"
        variant="secondary"
        onPress={() => router.push("/exam/speaking" as Href)}
      />
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
      {writtenExercises
        .filter((exercise) => exercise.kind === kind)
        .map((exercise) => (
          <View key={exercise.id} style={[themedCard(theme), { gap: 12 }]}>
            <Text style={{ color: theme.primaryText, fontWeight: "700" }}>
              Mức HSK {exercise.level} ·{" "}
              {exercise.answerLanguage === "ZH"
                ? "Viết tiếng Trung"
                : "Viết tiếng Việt"}
            </Text>
            <Text
              style={{
                color: theme.textPrimary,
                fontWeight: "800",
                fontSize: 19,
              }}
            >
              {exercise.title}
            </Text>
            <Text style={{ color: theme.textSecondary, lineHeight: 23 }}>
              {exercise.prompt}
            </Text>
            <PrimaryButton
              label="Mở bài / tiếp tục bản nháp"
              disabled={busy}
              onPress={() => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                setError("");
                void openWrittenDraft(db, exercise)
                  .then((attempt) => open(attempt.id))
                  .catch(() =>
                    setError("Chưa mở được bài. Dữ liệu cũ vẫn giữ nguyên."),
                  )
                  .finally(() => {
                    lock.current = false;
                    setBusy(false);
                  });
              }}
            />
          </View>
        ))}
      <Text
        style={{ color: theme.textPrimary, fontWeight: "800", fontSize: 20 }}
      >
        Bản nháp và bài đã tự đối chiếu
      </Text>
      {!loading && !attempts.length ? (
        <Text style={{ color: theme.textMuted }}>
          Chưa có bài viết. Mở một bài phía trên để bắt đầu.
        </Text>
      ) : null}
      {attempts.map((attempt) => (
        <PrimaryButton
          key={attempt.id}
          variant="ghost"
          label={`${writtenSnapshotTitle(attempt.snapshot_json)} · ${attempt.status === "DRAFT" ? "Bản nháp" : "Đã đối chiếu"}`}
          onPress={() => open(attempt.id)}
        />
      ))}
    </Screen>
  );
}
