import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, Text, TextInput, View } from "react-native";

import { LocalVoiceRecorder } from "@/components/LocalVoiceRecorder";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { themedCard } from "@/constants/design";
import { timedSpeakingPrompts } from "@/data/speaking-practice";
import { deleteSpeakingAttempt, listSpeakingAttempts, saveSpeakingAttempt, SpeakingRecordingEvidence, SPEAKING_HISTORY_LIMIT, type SpeakingAttempt } from "@/db/speaking-attempts";
import { useTheme } from "@/theme/ThemeProvider";

export default function TimedSpeaking() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [replayed, setReplayed] = useState(false);
  const [micBusy, setMicBusy] = useState(false);
  const [round, setRound] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const deadline = useRef<number | null>(null);
  const [notice, setNotice] = useState("");
  const prompt = timedSpeakingPrompts[index]!;
  const [selfReview, setSelfReview] = useState("");
  const [transcriptOptIn, setTranscriptOptIn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<SpeakingAttempt[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [visibleHistory, setVisibleHistory] = useState(20);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const operationLock = useRef(false);
  const screenFocused = useRef(false);
  const historyRequest = useRef(0);
  const evidence = useRef(new SpeakingRecordingEvidence(120000));
  const draft = useRef<Pick<SpeakingAttempt, "id" | "prompt" | "recordedAt" | "durationMs"> | null>(null);
  const loadHistory = useCallback(async () => {
    const request = ++historyRequest.current;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const attempts = await listSpeakingAttempts(db, SPEAKING_HISTORY_LIMIT);
      if (request === historyRequest.current && screenFocused.current) setHistory(attempts);
    } catch {
      if (request === historyRequest.current && screenFocused.current) setHistoryError("Chưa đọc được lịch sử. Dữ liệu cũ không bị thay đổi; hãy thử lại.");
    } finally {
      if (request === historyRequest.current && screenFocused.current) setHistoryLoading(false);
    }
  }, [db]);
  const micChange = useCallback((busy: boolean) => {
    setMicBusy(busy);
    if (busy) {
      setReplayed(false);
      setChecked([]);
      evidence.current.reset();
      draft.current = null;
      setSaved(false);
      setSelfReview("");
      setTranscriptOptIn(false);
      setTranscript("");
    }
  }, []);
  const recordingComplete = useCallback((durationMs: number) => {
    if (durationMs > prompt.recordingSeconds * 1000 || !screenFocused.current) return;
    evidence.current.recordingCompleted(durationMs);
    const now = Date.now();
    draft.current = {
      id: `speaking-${now.toString(36)}-${Math.random().toString(36).slice(2, 12)}`,
      prompt: JSON.parse(JSON.stringify(prompt)) as SpeakingAttempt["prompt"],
      recordedAt: new Date(now).toISOString(), durationMs,
    };
  }, [prompt]);
  const replayStart = useCallback(() => evidence.current.replayStart(), []);
  const replayComplete = useCallback(() => {
    evidence.current.replayComplete();
    setReplayed(evidence.current.completedDuration() !== null);
  }, []);
  const reset = useCallback(() => {
    deadline.current = null;
    setRemaining(null);
    setReady(false);
    setReplayed(false);
    setChecked([]);
    evidence.current.reset();
    draft.current = null;
    setSaved(false);
    setSelfReview("");
    setTranscriptOptIn(false);
    setTranscript("");
    setMicBusy(false);
    setRound((value) => value + 1);
  }, []);
  useFocusEffect(
    useCallback(() => {
      screenFocused.current = true;
      setSaving(operationLock.current);
      setDeleting(null);
      void loadHistory();
      const subscription = AppState.addEventListener("change", (state) => {
        if (state !== "active") {
          reset();
          setNotice(
            "Lượt bị gián đoạn khi app vào nền. Bản ghi tạm đã được xóa; hãy bắt đầu lại.",
          );
        }
      });
      return () => {
        subscription.remove();
        screenFocused.current = false;
        historyRequest.current++;
        reset();
      };
    }, [loadHistory, reset]),
  );
  const save = async () => {
    const attempt = draft.current;
    const duration = evidence.current.completedDuration();
    if (!attempt || duration === null || saved || operationLock.current) return;
    operationLock.current = true;
    setSaving(true);
    setNotice("");
    try {
      await saveSpeakingAttempt(db, {
        ...attempt, durationMs: duration, selfReview, checklist: checked,
        transcriptOptIn, transcript: transcriptOptIn ? transcript : null,
        recordingCompleted: true, replayCompleted: true,
      });
      if (screenFocused.current && draft.current?.id === attempt.id) {
        setSaved(true);
        setNotice("Đã lưu thông tin lượt nói trên máy, không lưu âm thanh.");
      }
      if (screenFocused.current) await loadHistory();
    } catch {
      if (screenFocused.current && draft.current?.id === attempt.id) setNotice("Chưa lưu được. Giữ nguyên thông tin; hãy thử lại trước khi rời màn hình.");
    } finally {
      operationLock.current = false;
      if (screenFocused.current) setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (deleteConfirmation !== id || operationLock.current) return;
    operationLock.current = true;
    setDeleting(id);
    try {
      await deleteSpeakingAttempt(db, id, true);
      if (screenFocused.current) {
        setDeleteConfirmation(null);
        if (draft.current?.id === id) setSaved(false);
        setNotice("Đã xóa thông tin lượt nói. Không thể hoàn tác trong app; bản sao lưu cũ có thể còn thông tin này.");
        await loadHistory();
      }
    } catch {
      if (screenFocused.current) setNotice("Chưa xóa được lượt nói; hãy thử lại.");
    } finally {
      operationLock.current = false;
      if (screenFocused.current) { setDeleting(null); setSaving(false); }
    }
  };
  useEffect(() => {
    if (remaining === null) return;
    const timer = setInterval(() => {
      if (!deadline.current) return;
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0) {
        deadline.current = null;
        setRemaining(null);
        setReady(true);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [remaining]);
  return (
    <Screen
      title="Luyện nói có thời gian"
      subtitle="Bài gốc · tự đánh giá · không phải mô phỏng HSK/HSKK chính thức."
    >
      <Text style={{ color: theme.textMuted }}>
        Micro chỉ ghi trên thiết bị, không nhận diện/chấm phát âm hay gửi lên
        AI. Hãy nghe hết bản ghi trước khi tự đối chiếu. Bản ghi tạm không được
        lưu vào sao lưu.
      </Text>
      <Text style={{ color: theme.textMuted }}>
        Lưu âm thanh: chỉ trong phiên (mặc định). Giữ âm thanh 7/30 ngày hoặc đến khi xóa thủ công chưa hỗ trợ.
        Lịch sử chỉ giữ thông tin của {SPEAKING_HISTORY_LIMIT} lượt gần nhất; không có âm thanh để nghe lại sau khi rời phiên.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {timedSpeakingPrompts.map((item, i) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            aria-pressed={i === index}
            aria-disabled={micBusy || saving}
            accessibilityState={{ selected: i === index, disabled: micBusy || saving }}
            disabled={micBusy || saving}
            onPress={() => {
              reset();
              setNotice("");
              setIndex(i);
            }}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 14,
              backgroundColor: index === i ? theme.primary : theme.surface,
            }}
          >
            <Text
              style={{
                color: index === i ? theme.onPrimary : theme.textPrimary,
              }}
            >
              {item.level}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[themedCard(theme), { gap: 12 }]}>
        <Text
          style={{ color: theme.textPrimary, fontWeight: "800", fontSize: 21 }}
        >
          {prompt.title}
        </Text>
        <Text
          selectable
          style={{ color: theme.textPrimary, fontSize: 23, lineHeight: 34 }}
        >
          {prompt.prompt}
        </Text>
        <Text style={{ color: theme.textMuted }}>
          Chuẩn bị {prompt.preparationSeconds} giây · ghi tối đa{" "}
          {prompt.recordingSeconds} giây. Cấp độ ước lượng, nội dung chưa được
          kiểm chứng độc lập.
        </Text>
      </View>
      {Platform.OS === "web" ? (
        <Text style={{ color: theme.textMuted }}>
          Bạn có thể tập nói và tự đối chiếu đề trên web. Ghi âm hiện chỉ hỗ trợ
          Android/iOS.
        </Text>
      ) : (
        <>
          {!ready && remaining === null ? (
            <PrimaryButton
              label="Bắt đầu thời gian chuẩn bị"
              onPress={() => {
                deadline.current =
                  Date.now() + prompt.preparationSeconds * 1000;
                setRemaining(prompt.preparationSeconds);
                setNotice("");
              }}
            />
          ) : null}
          {remaining !== null ? (
            <Text style={{ color: theme.primaryText, fontSize: 24 }}>
              Chuẩn bị: {remaining} giây
            </Text>
          ) : null}
          {ready ? (
            <LocalVoiceRecorder
              key={`${prompt.id}-${round}`}
              maxDurationSeconds={prompt.recordingSeconds}
              onRecordingChange={micChange}
              onRecordingComplete={recordingComplete}
              onReplay={replayStart}
              onReplayComplete={replayComplete}
              recordingBlocked={saving || saved}
              playbackBlocked={saving}
            />
          ) : null}
        </>
      )}
      {replayed || Platform.OS === "web" ? (
        <View style={[themedCard(theme), { gap: 10 }]}>
          <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
            Tự đối chiếu — không suy ra điểm thi
          </Text>
          {prompt.checklist.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="checkbox"
              aria-checked={checked.includes(item)}
              accessibilityState={{ checked: checked.includes(item), disabled: saving || saved }}
              disabled={saving || saved}
              onPress={() =>
                setChecked((old) =>
                  old.includes(item)
                    ? old.filter((value) => value !== item)
                    : [...old, item],
                )
              }
              style={{ minHeight: 48, paddingVertical: 10 }}
            >
              <Text style={{ color: theme.textPrimary }}>
                {checked.includes(item) ? "✓" : "○"} {item}
              </Text>
            </Pressable>
          ))}
          <Text style={{ color: theme.textMuted }}>
            Bạn tự xác nhận {checked.length}/{prompt.checklist.length} tiêu chí.
            Không có điểm phát âm tự động; lượt này chỉ dùng để tự luyện.
          </Text>
          {Platform.OS !== "web" ? <>
            <Text style={{ color: theme.textPrimary }}>Ghi chú tự đánh giá (không bắt buộc)</Text>
            <TextInput accessibilityLabel="Ghi chú tự đánh giá" value={selfReview} onChangeText={setSelfReview}
              editable={!saving && !saved} multiline maxLength={2000} placeholder="Điều muốn cải thiện ở lượt sau"
              placeholderTextColor={theme.textMuted} style={{ minHeight: 88, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.textPrimary }} />
            <Pressable accessibilityRole="switch" accessibilityLabel="Lưu bản chép lời do tôi tự nhập" accessibilityState={{ checked: transcriptOptIn, disabled: saving || saved }}
              disabled={saving || saved} onPress={() => { setTranscriptOptIn(!transcriptOptIn); setTranscript(""); }} style={{ minHeight: 48, paddingVertical: 12 }}>
              <Text style={{ color: theme.textPrimary }}>Lưu bản chép lời tự nhập: {transcriptOptIn ? "Bật" : "Tắt (mặc định)"}</Text>
            </Pressable>
            <Text style={{ color: theme.textMuted }}>Không nhận diện giọng nói. Nếu bật, nội dung bạn nhập sẽ lưu trên máy và có thể có trong bản sao lưu thông tin.</Text>
            {transcriptOptIn ? <TextInput accessibilityLabel="Bản chép lời tự nhập" value={transcript} onChangeText={setTranscript}
              editable={!saving && !saved} multiline maxLength={4000} placeholder="Tự nhập lời đã nói (không bắt buộc)"
              placeholderTextColor={theme.textMuted} style={{ minHeight: 88, padding: 12, borderWidth: 1, borderColor: theme.border, borderRadius: 12, color: theme.textPrimary }} /> : null}
            <PrimaryButton label={saved ? "Đã lưu thông tin lượt nói" : "Lưu thông tin lượt nói (không âm thanh)"}
              loading={saving} disabled={saved || micBusy || deleting !== null} onPress={() => void save()} />
          </> : null}
        </View>
      ) : null}
      <PrimaryButton
        label="Làm lại lượt này"
        variant="ghost"
        disabled={micBusy || saving}
        onPress={reset}
      />
      {notice ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.textMuted }}
        >
          {notice}
        </Text>
      ) : null}
      <Text style={{ color: theme.textPrimary, fontSize: 20, fontWeight: "700" }}>Lịch sử thông tin lượt nói</Text>
      {historyLoading ? <ActivityIndicator accessibilityLabel="Đang đọc lịch sử lượt nói" color={theme.primary} /> : null}
      {historyError ? <>
        <Text accessibilityRole="alert" style={{ color: theme.error }}>{historyError}</Text>
        <PrimaryButton label="Thử đọc lại lịch sử lượt nói" variant="ghost" onPress={() => void loadHistory()} />
      </> : null}
      {!historyLoading && !historyError && history.length === 0 ? <Text style={{ color: theme.textMuted }}>Chưa có lượt nói đã lưu. Ghi âm và nghe hết bản ghi rồi chọn lưu thông tin.</Text> : null}
      {history.slice(0, visibleHistory).map((attempt) => <View key={attempt.id} style={[themedCard(theme), { gap: 10 }]}>
        <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>{attempt.prompt.title} · mức {attempt.prompt.level}</Text>
        <Text style={{ color: theme.textMuted }}>{new Date(attempt.recordedAt).toLocaleString("vi-VN")} · {(attempt.durationMs / 1000).toFixed(1)} giây</Text>
        <Text selectable style={{ color: theme.textPrimary }}>{attempt.prompt.prompt}</Text>
        {attempt.prompt.checklist.map((item) => <Text key={item} style={{ color: theme.textPrimary }}>{attempt.checklist.includes(item) ? "✓" : "○"} {item}</Text>)}
        {attempt.selfReview ? <Text selectable style={{ color: theme.textPrimary }}>Tự đánh giá: {attempt.selfReview}</Text> : null}
        {attempt.transcriptOptIn && attempt.transcript ? <Text selectable style={{ color: theme.textPrimary }}>Bản chép lời tự nhập: {attempt.transcript}</Text> : null}
        <Text style={{ color: theme.textMuted }}>Chỉ thông tin · không âm thanh · không có điểm phát âm.</Text>
        {deleteConfirmation === attempt.id ? <>
          <Text accessibilityRole="alert" style={{ color: theme.error }}>Xóa thông tin lượt này? Không thể hoàn tác trong app; bản sao lưu cũ không bị xóa.</Text>
          <PrimaryButton label="Xác nhận xóa thông tin lượt nói" variant="danger" loading={deleting === attempt.id} disabled={saving || deleting !== null} onPress={() => void remove(attempt.id)} />
          <PrimaryButton label="Giữ lượt nói" variant="ghost" disabled={deleting !== null} onPress={() => setDeleteConfirmation(null)} />
        </> : <PrimaryButton label={`Xóa thông tin: ${attempt.prompt.title}`} variant="ghost" disabled={saving || deleting !== null} onPress={() => setDeleteConfirmation(attempt.id)} />}
      </View>)}
      {history.length > visibleHistory ? <PrimaryButton label="Xem thêm lịch sử lượt nói" variant="ghost" onPress={() => setVisibleHistory((value) => Math.min(value + 20, SPEAKING_HISTORY_LIMIT))} /> : null}
    </Screen>
  );
}
