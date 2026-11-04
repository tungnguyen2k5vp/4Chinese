import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, Text, TextInput, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { HanziHandwritingPad } from "@/components/HanziHandwritingPad";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StrokeWriter } from "@/components/StrokeWriter";
import {
  ChineseMemoryOnly,
  MemoryLink,
  MemoryLoadState,
  useMemoryResource,
} from "@/components/memory/MemoryPrimitives";
import { themedCard } from "@/constants/design";
import {
  listMemoryCandidates,
  recordMemoryChoice,
  type MemoryCandidate,
} from "@/db/hanzi-memory";
import { getVocabulary, listVocabulary } from "@/db/repository";
import { listVocabularyContexts } from "@/db/vocabulary-context";
import { stopChineseSpeech } from "@/services/audio/chinese-speech";
import { getStrokePaths } from "@/services/handwriting/stroke-data";
import { characterContrastGroups } from "@/services/memory/character-content";
import {
  assessRecallInk,
  buildMemoryQuestion,
  checkMemoryAnswer,
  chooseMemoryDirection,
  recallOutcome,
  type InkEvidence,
  type MemoryQuestion,
  type MemoryOutcome,
} from "@/services/memory/hanzi-memory";
import { useTheme } from "@/theme/ThemeProvider";
import type { Vocabulary } from "@/types/models";

type Params = {
  mode?: string;
  id?: string;
  character?: string;
  size?: string;
  assisted?: string;
};
type Completed = {
  word: Vocabulary;
  outcome: MemoryOutcome;
  selfReported: boolean;
};
const outcomeLabels: Record<MemoryOutcome, string> = {
  UNASSISTED: "Nhớ không gợi ý",
  ASSISTED: "Nhớ sau gợi ý",
  NOT_RECALLED: "Chưa nhớ",
  UNVERIFIED: "Chưa xác minh",
};
export default function MemorySession() {
  const params = useLocalSearchParams<Params>();
  return (
    <ChineseMemoryOnly>
      <Session
        key={`${params.mode}:${params.id}:${params.character}:${params.size}`}
        params={params}
      />
    </ChineseMemoryOnly>
  );
}

function Session({ params }: { params: Params }) {
  const db = useSQLiteContext(),
    theme = useTheme();
  const size = [5, 10, 15, 20].includes(Number(params.size))
    ? Number(params.size)
    : 5;
  const [index, setIndex] = useState(0),
    [batchStart, setBatchStart] = useState(0),
    [completed, setCompleted] = useState<Completed[]>([]);
  const load = useCallback(async () => {
    let candidates: MemoryCandidate[];
    if (params.character) {
      const char = characterContrastGroups
        .flatMap((g) => g.characters)
        .find((c) => c.hanzi === params.character);
      if (!char) throw new Error("MISSING_EDITORIAL_CHARACTER");
      const word = {
        id: `editorial-${char.hanzi}`,
        simplified: char.hanzi,
        traditional: char.hanzi,
        pinyin: char.pinyin,
        pinyinNumeric: "",
        primaryMeaningVi: char.meaning,
        meaningsVi: [char.meaning],
        meaningsEn: [],
        pos: [],
        hskBand: 1,
        examples: [],
        radical: null,
        strokeCount: getStrokePaths(char.hanzi).length,
        source: "4Chinese editorial contrast",
        sourceUrl: char.sourceUrl,
      } as unknown as Vocabulary;
      candidates = [
        {
          word,
          learnedAt: null,
          lastReviewAt: null,
          wrongCount: 0,
          lapseCount: 0,
          mistakes: [],
          personalSentence: null,
        },
      ];
    } else if (params.id) {
      const [word, contexts] = await Promise.all([
        getVocabulary(db, params.id),
        listVocabularyContexts(db, params.id),
      ]);
      candidates = word
        ? [
            {
              word,
              learnedAt: null,
              lastReviewAt: null,
              wrongCount: 0,
              lapseCount: 0,
              mistakes: [],
              personalSentence: contexts[0]?.sentence ?? null,
            },
          ]
        : [];
      const observed = await listMemoryCandidates(db, "weak", 50);
      const personal = observed.find((c) => c.word.id === params.id);
      if (personal) candidates = [personal];
    } else
      candidates = await listMemoryCandidates(
        db,
        params.mode === "old" ? "old" : params.mode === "weak" ? "weak" : "all",
        50,
      );
    const catalog = await listVocabulary(db, { limit: 300 });
    return { candidates, catalog };
  }, [db, params.character, params.id, params.mode]);
  const resource = useMemoryResource(load),
    candidate = resource.data?.candidates[index];
  const question = useMemo(
    () =>
      candidate
        ? buildMemoryQuestion(
            candidate.word,
            params.mode === "writing" || Boolean(params.character)
              ? "writing"
              : params.mode === "context"
                ? "cloze"
                : chooseMemoryDirection(candidate.mistakes, index),
            resource.data?.catalog ?? [],
            candidate.personalSentence,
          )
        : null,
    [candidate, index, params.mode, params.character, resource.data?.catalog],
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void stopChineseSpeech();
    });
    return () => {
      sub.remove();
      void stopChineseSpeech();
    };
  }, []);
  const total = resource.data?.candidates.length ?? 0,
    batchEnd = Math.min(batchStart + size, total);
  if (resource.loading || resource.error)
    return (
      <Screen title="Củng cố trí nhớ">
        <MemoryLoadState {...resource} />
      </Screen>
    );
  if (!total)
    return (
      <Screen title="Chưa có từ phù hợp">
        <Text style={{ color: theme.textSecondary }}>
          Hãy học từ trước hoặc chọn một nhóm chữ để đối chiếu.
        </Text>
        <MemoryLink
          label="Về củng cố trí nhớ"
          onPress={() => router.replace("/memory" as Href)}
        />
      </Screen>
    );
  if (index >= batchEnd) {
    const results = completed.slice(batchStart, batchEnd);
    return (
      <Screen
        title="Đã hoàn thành phiên bổ trợ"
        subtitle="Lịch ôn SRS, cấp nhớ và XP của bạn không đổi."
      >
        <View style={[themedCard(theme), { gap: 10 }]}>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 22,
              fontWeight: "800",
            }}
          >
            Đã luyện {results.length} từ
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            Đúng không gợi ý (đã kiểm tra):{" "}
            {
              results.filter(
                (r) => !r.selfReported && r.outcome === "UNASSISTED",
              ).length
            }
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            Đúng sau gợi ý (đã kiểm tra):{" "}
            {
              results.filter((r) => !r.selfReported && r.outcome === "ASSISTED")
                .length
            }
          </Text>
          <Text style={{ color: theme.textMuted }}>
            Tự đánh giá bài viết: {results.filter((r) => r.selfReported).length}{" "}
            · chưa được chấm độ chính xác từng nét.
          </Text>
          {results.map((result) => (
            <View
              key={result.word.id}
              style={{
                borderTopWidth: 1,
                borderColor: theme.border,
                paddingTop: 8,
              }}
            >
              <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>
                {result.word.simplified} · {outcomeLabels[result.outcome]}
                {result.selfReported ? " (tự đánh giá)" : ""}
              </Text>
            </View>
          ))}
        </View>
        {index < total ? (
          <PrimaryButton
            label={`Luyện ${Math.min(size, total - index)} từ tiếp theo`}
            onPress={() => setBatchStart(index)}
          />
        ) : null}
        <MemoryLink
          label="Về củng cố trí nhớ"
          onPress={() => router.replace("/memory" as Href)}
        />
      </Screen>
    );
  }
  return (
    <Screen
      key={index}
      title={
        params.mode === "old"
          ? "Bạn còn nhớ không?"
          : question?.type === "writing"
            ? "Nhớ chữ rồi viết"
            : "Luyện nhớ xen kẽ"
      }
      subtitle={`Từ ${index - batchStart + 1}/${batchEnd - batchStart} · Phiên bổ trợ không đổi lịch ôn.`}
      avoidKeyboard
    >
      {question ? (
        <Question
          key={question.word.id}
          question={question}
          initialHinted={params.assisted === "1"}
          onComplete={(outcome, selfReported) => {
            void stopChineseSpeech();
            setCompleted((rows) => [
              ...rows,
              { word: question.word, outcome, selfReported },
            ]);
            setIndex((value) => value + 1);
          }}
        />
      ) : null}
    </Screen>
  );
}

function Question({
  question: q,
  initialHinted,
  onComplete,
}: {
  question: MemoryQuestion;
  initialHinted: boolean;
  onComplete: (outcome: MemoryOutcome, selfReported: boolean) => void;
}) {
  const db = useSQLiteContext(),
    theme = useTheme();
  const [answer, setAnswer] = useState(""),
    [hinted, setHinted] = useState(initialHinted),
    [showHint, setShowHint] = useState(false),
    [feedback, setFeedback] = useState<{
      correct: boolean | null;
      hintUsed: boolean;
      forgotten: boolean;
    } | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [ink, setInk] = useState<InkEvidence | null>(null),
    [attempted, setAttempted] = useState(false),
    [round, setRound] = useState(0),
    [sample, setSample] = useState(false),
    [started, setStarted] = useState(() => Date.now());
  const locked = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const writing = q.type === "writing";
  const submit = async (forgotten = false) => {
    if (locked.current || feedback || (writing && !forgotten && !attempted))
      return;
    locked.current = true;
    setSaving(true);
    setError("");
    const correct = forgotten ? false : checkMemoryAnswer(q, answer);
    try {
      if (!writing)
        await recordMemoryChoice(db, q, {
          correct,
          hintUsed: hinted || forgotten,
          responseTimeMs: Date.now() - started,
        });
      if (live.current) {
        if (forgotten) setHinted(true);
        setFeedback({
          correct: writing ? null : correct,
          hintUsed: hinted || forgotten,
          forgotten,
        });
      }
    } catch {
      if (live.current)
        setError(
          "Chưa lưu được kết quả bổ trợ. Câu trả lời vẫn còn; hãy thử lại.",
        );
    } finally {
      locked.current = false;
      if (live.current) setSaving(false);
    }
  };
  const assessment =
    feedback && writing
      ? assessRecallInk(
          q.word.simplified,
          ink,
          Array.from(q.word.simplified).map(
            (char) => getStrokePaths(char).length,
          ),
        )
      : null;
  return (
    <>
      <View style={[themedCard(theme), { gap: 14 }]}>
        <Text
          style={{ color: theme.textMuted, fontSize: 13, fontWeight: "800" }}
        >
          {q.type === "hanzi_to_meaning"
            ? "NHỚ NGHĨA"
            : q.type === "hanzi_to_pinyin"
              ? "NHỚ PINYIN"
              : q.type === "cloze"
                ? "ĐIỀN TỪ TRONG CÂU"
                : q.type === "pinyin_to_hanzi"
                  ? "PINYIN → HÁN TỰ"
                  : q.type === "audio_to_hanzi"
                    ? "NGHE → HÁN TỰ"
                    : "TỰ NHỚ HÁN TỰ"}
        </Text>
        <Text
          style={{ color: theme.textPrimary, fontSize: 26, fontWeight: "800" }}
        >
          {q.prompt}
        </Text>
        {q.contextSource ? (
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {q.contextSource === "PERSONAL_CONTEXT"
              ? "Câu ngữ cảnh bạn đã lưu"
              : "Ví dụ có sẵn trong mục từ"}
          </Text>
        ) : null}
        {q.type === "audio_to_hanzi" ? (
          <>
            <AudioButton
              text={q.word.simplified}
              accessibilityLabel="Nghe từ cần nhớ"
              allowWhenSoundDisabled
            />
            <MemoryLink
              label="Không thể nghe lúc này – luyện từ nghĩa"
              onPress={() => {
                setHinted(true);
                setShowHint(true);
              }}
            />
          </>
        ) : null}
        {!feedback && q.choices.length ? (
          <View accessibilityRole="radiogroup" accessibilityLabel="Chọn đáp án">
            {q.choices.map((choice) => (
              <Pressable
                key={choice}
                accessibilityRole="radio"
                accessibilityState={{
                  checked: answer === choice,
                  disabled: saving,
                }}
                disabled={saving}
                onPress={() => setAnswer(choice)}
                style={{
                  minHeight: 52,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: answer === choice ? theme.primary : theme.border,
                  borderRadius: 14,
                  backgroundColor:
                    answer === choice ? theme.primarySoft : theme.surface,
                }}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 17 }}>
                  {choice}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {writing ? (
          <HanziHandwritingPad
            key={round}
            characterCount={Array.from(q.word.simplified).length}
            targetWord={q.word.simplified}
            onSelect={setAnswer}
            onHintUsed={() => setHinted(true)}
            onInkEvidence={setInk}
            onAttemptChanged={setAttempted}
            editable={!feedback && !saving}
          />
        ) : null}
        {!feedback && !writing && !q.choices.length ? (
          <TextInput
            accessibilityLabel="Hán tự bạn nhớ"
            value={answer}
            onChangeText={setAnswer}
            autoCorrect={false}
            editable={!saving}
            placeholder="Nhập Hán tự"
            placeholderTextColor={theme.textMuted}
            style={{
              minHeight: 54,
              padding: 12,
              fontSize: 24,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.textPrimary,
            }}
          />
        ) : null}
        {showHint && !feedback ? (
          <Text style={{ color: theme.textSecondary }}>
            {q.type === "audio_to_hanzi"
              ? q.word.primaryMeaningVi
              : q.choices.length
                ? `Gợi ý: ${Array.from(q.expected)[0] ?? ""}…`
                : `Từ gồm ${Array.from(q.word.simplified).length} Hán tự. Hãy thử nhớ từng chữ; trong bài viết bạn có thể xin từng nét.`}
          </Text>
        ) : null}
        {!feedback ? (
          <>
            <MemoryLink
              label="Gợi ý"
              onPress={() => {
                setHinted(true);
                setShowHint(true);
              }}
            />
            <PrimaryButton
              label={
                saving
                  ? "Đang lưu…"
                  : writing
                    ? "Đối chiếu bài viết"
                    : "Kiểm tra"
              }
              disabled={saving || (writing ? !attempted : !answer.trim())}
              onPress={() => void submit()}
            />
            <MemoryLink
              label="Không nhớ – xem đáp án"
              onPress={() => void submit(true)}
            />
          </>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
        ) : null}
      </View>
      {feedback ? (
        <View style={[themedCard(theme), { gap: 12 }]}>
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: writing
                ? theme.textPrimary
                : feedback.correct
                  ? theme.success
                  : theme.error,
              fontSize: 20,
              fontWeight: "800",
            }}
          >
            {writing
              ? "Tự đối chiếu bài viết"
              : feedback.correct
                ? hinted
                  ? "Đúng sau gợi ý"
                  : "Đúng không gợi ý"
                : "Chưa đúng"}
          </Text>
          <Text
            style={{
              fontSize: 38,
              color: theme.textPrimary,
              fontWeight: "800",
            }}
          >
            {q.word.simplified}
          </Text>
          <PinyinText value={q.word.pinyin} />
          <Text style={{ color: theme.textSecondary }}>
            {q.word.primaryMeaningVi}
          </Text>
          <AudioButton text={q.word.simplified} />
          {q.type === "cloze" ? (
            <Text style={{ color: theme.textSecondary }}>
              {q.prompt.split("＿＿").join(q.word.simplified)}
            </Text>
          ) : null}
          {assessment ? (
            <>
              <Text style={{ color: theme.textSecondary }}>
                {assessment.face === "MATCH"
                  ? "Nhận diện khớp mặt chữ."
                  : assessment.face === "DIFFERENT"
                    ? "Nhận diện ra chữ khác; hãy so sánh lại mẫu."
                    : "Chưa xác minh được mặt chữ từ nét viết."}{" "}
                Chưa chấm được hình dạng và thứ tự từng nét.
              </Text>
              {assessment.issues.map((issue) => (
                <Text key={issue} style={{ color: theme.warning }}>
                  {issue}
                </Text>
              ))}
            </>
          ) : null}
          {writing ? (
            <>
              <MemoryLink
                label={sample ? "Ẩn mẫu nét" : "Xem mẫu từng nét"}
                onPress={() => {
                  setSample((value) => !value);
                  setHinted(true);
                }}
              />
              {sample
                ? Array.from(q.word.simplified).map((char, i) => (
                    <StrokeWriter key={`${char}-${i}`} character={char} />
                  ))
                : null}
              <MemoryLink
                label="Che mẫu và viết lại"
                onPress={() => {
                  setRound((v) => v + 1);
                  setHinted(true);
                  setInk(null);
                  setAttempted(false);
                  setAnswer("");
                  setFeedback(null);
                  setSample(false);
                  setShowHint(false);
                  setStarted(Date.now());
                }}
              />
              <Text style={{ color: theme.textMuted }}>
                Đánh giá dưới đây là do bạn tự đối chiếu; không được ghi thành
                điểm chấm nét.
              </Text>
              <PrimaryButton
                label="Tự đánh giá: tôi đã nhớ"
                disabled={feedback.forgotten || !attempted}
                onPress={() =>
                  onComplete(recallOutcome(true, feedback.hintUsed), true)
                }
              />
              <MemoryLink
                label="Tự đánh giá: chưa nhớ"
                onPress={() => onComplete("NOT_RECALLED", true)}
              />
            </>
          ) : (
            <>
              <PrimaryButton
                label="Từ tiếp theo"
                onPress={() =>
                  onComplete(recallOutcome(feedback.correct, hinted), false)
                }
              />
              {!feedback.correct ? (
                <MemoryLink
                  label="Nhớ và viết lại từ này"
                  onPress={() =>
                    router.push({
                      pathname: "/memory/session",
                      params: { id: q.word.id, mode: "writing", assisted: "1" },
                    } as Href)
                  }
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </>
  );
}
