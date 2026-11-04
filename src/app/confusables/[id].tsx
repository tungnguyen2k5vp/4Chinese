import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ChineseAIEntry } from "@/components/ChineseAIEntry";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { themedCard } from "@/constants/design";
import {
  findConfusablePair,
  type ConfusablePair,
  type ConfusableQuestion,
} from "@/data/confusable-words";
import { recordConfusableAnswer } from "@/db/confusable-words";
import { useStudySession } from "@/hooks/use-study-session";
import { useTheme } from "@/theme/ThemeProvider";

function Question({
  pair,
  question,
  assisted,
}: {
  pair: ConfusablePair;
  question: ConfusableQuestion;
  assisted: boolean;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [attemptId] = useState(
    () => `conf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const submit = async () => {
    if (!selected || busy.current || result !== null) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const correct = await recordConfusableAnswer(db, {
        id: attemptId,
        pairId: pair.id,
        questionId: question.id,
        selectedWord: selected,
        assisted,
      });
      if (live.current) setResult(correct);
    } catch {
      if (live.current)
        setError(
          "Chưa lưu được lượt luyện. Đáp án vẫn giữ nguyên; hãy thử lại.",
        );
    } finally {
      busy.current = false;
      if (live.current) setSaving(false);
    }
  };
  return (
    <View style={[themedCard(theme), { gap: 14 }]}>
      <Text style={{ color: theme.textPrimary, fontSize: 24, lineHeight: 34 }}>
        {question.sentence}
      </Text>
      <Text style={{ color: theme.textSecondary }}>{question.translation}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={`Chọn từ cho ${question.sentence}`}
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
      >
        {pair.words.map((word) => (
          <Pressable
            key={word.hanzi}
            accessibilityRole="radio"
            accessibilityLabel={word.hanzi}
            accessibilityState={{
              checked: selected === word.hanzi,
              disabled: saving || result !== null,
            }}
            aria-checked={selected === word.hanzi}
            aria-disabled={saving || result !== null}
            disabled={saving || result !== null}
            onPress={() => setSelected(word.hanzi)}
            style={{
              minHeight: 48,
              padding: 14,
              borderWidth: 1,
              borderRadius: 14,
              borderColor:
                selected === word.hanzi ? theme.primary : theme.border,
              backgroundColor:
                selected === word.hanzi ? theme.primarySoft : theme.surface,
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 22 }}>
              {word.hanzi}
            </Text>
          </Pressable>
        ))}
      </View>
      {result === null ? (
        <PrimaryButton
          label={saving ? "Đang lưu…" : "Kiểm tra câu này"}
          disabled={!selected || saving}
          onPress={() => void submit()}
        />
      ) : (
        <>
          <Text
            accessibilityRole="alert"
            style={{
              color: result ? theme.success : theme.error,
              fontWeight: "800",
            }}
          >
            {result
              ? "Đúng trong ngữ cảnh này."
              : `Ở đây dùng ${question.answer}.`}
          </Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 24 }}>
            {question.explanation}
          </Text>
        </>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function ConfusableLesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pair = findConfusablePair(id);
  const theme = useTheme();
  const db = useSQLiteContext();
  useStudySession(db);
  const [showComparison, setShowComparison] = useState(false);
  const [seenComparison, setSeenComparison] = useState(false);
  const [round, setRound] = useState(0);
  const [draft, setDraft] = useState("");
  if (!pair)
    return (
      <Screen title="Không tìm thấy bài phân biệt">
        <PrimaryButton
          label="Chọn cặp từ khác"
          onPress={() => router.replace("/confusables" as unknown as Href)}
        />
      </Screen>
    );
  return (
    <Screen
      title={pair.title}
      subtitle="Chọn từ theo ngữ cảnh, sau đó đọc lý do. Không đổi lịch ôn SRS."
    >
      <Text style={{ color: theme.textMuted }}>
        Bài luyện này giúp phân biệt các từ gần nghĩa; kết quả không thay đổi điểm thi.
      </Text>
      <ChineseAIEntry label="Hỏi AI cách phân biệt" context={{ label: pair.title, task: 'compare', context: { kind: 'comparison', words: pair.words.slice(0, 4).map(w => ({ hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, usage: w.usage })) } }} />
      <PrimaryButton
        label={
          showComparison ? "Ẩn bảng so sánh" : "Xem cách dùng trước khi luyện"
        }
        variant="secondary"
        onPress={() => {
          setSeenComparison(true);
          setShowComparison((value) => !value);
        }}
      />
      {showComparison ? (
        <View style={[themedCard(theme), { gap: 14 }]}>
          {pair.words.map((word) => (
            <View key={word.hanzi} style={{ gap: 8 }}>
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 22,
                  fontWeight: "800",
                }}
              >
                {word.hanzi} · {word.pinyin}
              </Text>
              <Text style={{ color: theme.textPrimary }}>{word.meaning}</Text>
              <Text style={{ color: theme.textSecondary, lineHeight: 24 }}>
                {word.usage}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {pair.questions.map((question) => (
        <Question
          key={`${pair.id}-${round}-${question.id}`}
          pair={pair}
          question={question}
          assisted={seenComparison || round > 0}
        />
      ))}
      <View style={[themedCard(theme), { gap: 12 }]}>
        <Text
          style={{ color: theme.textPrimary, fontWeight: "800", fontSize: 20 }}
        >
          Tự đặt câu
        </Text>
        <Text style={{ color: theme.textSecondary }}>{pair.writingPrompt}</Text>
        <TextInput
          accessibilityLabel="Câu tôi tự đặt"
          placeholder="Nhập câu tiếng Trung"
          placeholderTextColor={theme.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={1500}
          style={{
            color: theme.textPrimary,
            minHeight: 110,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            padding: 12,
            textAlignVertical: "top",
          }}
        />
        <Text style={{ color: theme.textMuted }}>
          Ô này dùng để tự đối chiếu, không chấm tự động và chưa lưu khi rời
          bài. Các câu trắc nghiệm đã kiểm tra được lưu riêng.
        </Text>
      </View>
      <PrimaryButton
        label="Luyện lại (đã xem đáp án)"
        variant="secondary"
        onPress={() => setRound((value) => value + 1)}
      />
      <PrimaryButton
        label="Xem sổ lỗi"
        onPress={() => router.push("/mistakes" as Href)}
      />
    </Screen>
  );
}
