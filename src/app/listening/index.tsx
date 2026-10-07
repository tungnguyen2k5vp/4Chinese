import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { LearningLandscape } from '@/components/visual/LearningLandscape';
import { themedCard } from "@/constants/design";
import {
  getListeningComprehension,
  listListeningItems,
  type ListeningItem,
} from "@/db/listening-library";
import {
  speakChinese,
  stopChineseSpeech,
} from "@/services/audio/chinese-speech";
import { useTheme } from "@/theme/ThemeProvider";

export default function ListeningLibrary() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const request = useRef(0);
  const speechRequest = useRef(0);
  const [level, setLevel] = useState("1");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ListeningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ListeningItem | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rate, setRate] = useState(0.75);
  const [speaking, setSpeaking] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [usedSupport, setUsedSupport] = useState(false);
  const comprehension = selected ? getListeningComprehension(selected) : null;
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const rows = await listListeningItems(db, { level, offset });
      if (id === request.current) setItems(rows);
    } catch {
      if (id === request.current)
        setError(
          "Chưa tải được thư viện nghe. Dữ liệu của bạn vẫn giữ nguyên.",
        );
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [db, level, offset]);
  useFocusEffect(
    useCallback(() => {
      setSpeaking(false);
      void load();
      return () => {
        request.current++;
        speechRequest.current++;
        void stopChineseSpeech().catch(() => undefined);
      };
    }, [load]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        speechRequest.current++;
        void stopChineseSpeech().catch(() => undefined);
        setSpeaking(false);
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);
  const stop = () => {
    speechRequest.current++;
    setSpeaking(false);
    void stopChineseSpeech().catch(() => undefined);
  };
  const play = async () => {
    if (!selected) return;
    const id = ++speechRequest.current;
    setAudioError("");
    setSpeaking(true);
    const finish = () => {
      if (id === speechRequest.current) setSpeaking(false);
    };
    try {
      const result = await speakChinese(selected.transcript, {
        rate,
        onDone: finish,
        onStopped: finish,
        onError: () => {
          finish();
          if (id === speechRequest.current)
            setAudioError(
              "Giọng TTS không phát được. Hãy kiểm tra dịch vụ đọc và âm lượng.",
            );
        },
      });
      if (id === speechRequest.current && !result.ok) {
        finish();
        if (result.reason === "missing-mandarin-voice")
          setAudioError(
            "Chưa có giọng tiếng Trung. Hãy tải giọng zh-CN trong cài đặt TTS; bạn vẫn có thể đọc bản chép lời.",
          );
      }
    } catch {
      finish();
      if (id === speechRequest.current)
        setAudioError(
          "Không phát được TTS. Bạn có thể mở bản chép lời để học tiếp.",
        );
    }
  };
  return (
    <Screen hideTitle title="Luyện nghe">
      <View style={[themedCard(theme), { overflow: 'hidden', padding: 0, gap: 0 }]}>
        <LearningLandscape scene="listen" height={96} />
        <View style={{ gap: 5, padding: 16 }}>
          <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '800' }}>Nghe trước, mở lời thoại sau</Text>
          <Text style={{ color: theme.textSecondary, lineHeight: 20 }}>Chọn cấp độ và câu muốn luyện. Âm thanh dùng giọng đọc máy trên thiết bị, không phải bản thu người bản ngữ.</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: 16 }} accessibilityLabel="Chọn cấp độ HSK">
        {["1", "2", "3", "4", "5", "6", "7-9"].map((band) => (
          <Pressable
            key={band}
            accessibilityRole="tab"
            aria-selected={level === band}
            accessibilityState={{ selected: level === band }}
            onPress={() => {
              stop();
              setLevel(band);
              setOffset(0);
              setSelected(null);
            }}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 12,
              backgroundColor: level === band ? theme.primary : theme.surface,
            }}
          >
            <Text
              style={{
                color: level === band ? theme.onPrimary : theme.textPrimary,
              }}
            >
              HSK {band}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <>
          <Text style={{ color: theme.error }}>{error}</Text>
          <PrimaryButton label="Thử lại" onPress={() => void load()} />
        </>
      ) : null}
      {!loading && !error && !items.length ? (
        <EmptyState variant="listening" scene="recordings" title="Chưa có câu nghe ở cấp độ này" message="Chọn một cấp độ khác hoặc quay lại sau. Những câu chưa sẵn sàng sẽ không được thêm vào bài luyện." />
      ) : null}
      {!loading && !error
        ? items.map((item, index) => (
            <View key={item.id} style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Chọn câu nghe ${offset + index + 1}`}
                onPress={() => {
                  stop();
                  setSelected(item);
                  setRevealed(false);
                  setAudioError("");
                  setAnswer(null);
                  setChecked(false);
                  setUsedSupport(false);
                }}
                style={[
                  themedCard(theme),
                  {
                    minHeight: 64,
                    borderWidth: selected?.id === item.id ? 2 : 1,
                    borderColor:
                      selected?.id === item.id ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  Câu {offset + index + 1} · HSK {item.level}
                </Text>
                <Text style={{ color: theme.textMuted }}>
                  Phát bằng giọng đọc máy · câu dùng để tự luyện
                </Text>
              </Pressable>
              {selected?.id === item.id ? (
                <View style={[themedCard(theme), { gap: 12 }]}>
                  <Text
                    accessibilityRole="header"
                    style={{
                      color: theme.textPrimary,
                      fontSize: 20,
                      fontWeight: "700",
                    }}
                  >
                    Nghe trước, tự đối chiếu sau
                  </Text>
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ minHeight: 94, borderRadius: 20, backgroundColor: theme.primarySoft, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
                    <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                      <Ionicons name={speaking ? 'volume-high' : 'headset'} size={27} color={theme.skillColors.listening} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <Text style={{ color: theme.textPrimary, fontSize: 14, fontWeight: '800' }}>Giọng đọc tiếng Trung trên thiết bị</Text>
                      <Text accessibilityLiveRegion="polite" style={{ color: theme.skillColors.listening, fontSize: 11, fontWeight: '900' }}>{speaking ? 'ĐANG PHÁT' : 'SẴN SÀNG PHÁT'}</Text>
                    </View>
                  </View>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {[0.75, 1, 1.25].map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: rate === value }}
                        accessibilityLabel={`Tốc độ đọc ${value} lần`}
                        onPress={() => {
                          stop();
                          setRate(value);
                        }}
                        style={{
                          minHeight: 48,
                          padding: 12,
                          backgroundColor:
                            rate === value ? theme.primarySoft : theme.surface,
                        }}
                      >
                        <Text style={{ color: theme.primaryText }}>
                          {value === 0.75 ? "Tốc độ 0.75×" : `Tốc độ ${value}×`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <PrimaryButton
                    label={speaking ? "Dừng nghe" : "Phát câu / nghe lại"}
                    onPress={() => (speaking ? stop() : void play())}
                  />
                  {audioError ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={{ color: theme.error }}
                    >
                      {audioError}
                    </Text>
                  ) : null}
                  {comprehension ? (
                    <View style={{ gap: 10 }}>
                      <Text style={{ color: theme.textMuted }}>
                        Câu hỏi gợi ý để tự kiểm tra. Hãy đối chiếu với bản chép lời; kết quả không tính điểm thi.
                      </Text>
                      <Text style={{ color: theme.textPrimary, fontSize: 18 }}>
                        {comprehension.promptVi}
                      </Text>
                      {comprehension.choices.map((choice, index) => (
                        <Pressable
                          key={choice}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: answer === index,
                            disabled: checked,
                          }}
                          disabled={checked}
                          onPress={() => setAnswer(index)}
                          style={{
                            minHeight: 48,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor:
                              answer === index
                                ? theme.primarySoft
                                : theme.surface,
                          }}
                        >
                          <Text style={{ color: theme.textPrimary }}>
                            {answer === index ? "✓ " : ""}
                            {choice}
                          </Text>
                        </Pressable>
                      ))}
                      <PrimaryButton
                        label="Đối chiếu câu trả lời"
                        variant="secondary"
                        disabled={answer === null || checked}
                        onPress={() => setChecked(true)}
                      />
                      {checked ? (
                        <>
                          <Text
                            accessibilityLiveRegion="polite"
                            style={{ color: theme.textPrimary }}
                          >
                            {answer === comprehension.correctIndex
                              ? "Khớp đáp án tham khảo"
                              : "Chưa khớp đáp án tham khảo"}
                            {usedSupport
                              ? " · Đã xem bản chép lời hoặc đáp án trước đó; chỉ tự đối chiếu"
                              : " · Tự luyện, không phải điểm thi"}
                          </Text>
                          <Text style={{ color: theme.textPrimary }}>
                            Đáp án tham khảo:{" "}
                            {comprehension.choices[comprehension.correctIndex]}{" "}
                            · {comprehension.explanationVi}
                          </Text>
                          <PrimaryButton
                            label="Thử lại (đã biết đáp án)"
                            variant="ghost"
                            onPress={() => {
                              setChecked(false);
                              setAnswer(null);
                              setRevealed(false);
                              setUsedSupport(true);
                            }}
                          />
                        </>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ color: theme.textMuted }}>
                      Câu này chưa có câu hỏi đồng hành phù hợp; bạn có thể nghe
                      và tự đối chiếu bản chép lời.
                    </Text>
                  )}
                  <PrimaryButton
                    label={
                      revealed ? "Ẩn bản chép lời" : "Mở bản chép lời và nghĩa"
                    }
                    variant="secondary"
                    onPress={() => {
                      if (!revealed) setUsedSupport(true);
                      setRevealed((value) => !value);
                    }}
                  />
                  {revealed ? (
                    <>
                      <Text
                        style={{
                          color: theme.textPrimary,
                          fontSize: 24,
                          lineHeight: 36,
                        }}
                      >
                        {selected.transcript}
                      </Text>
                      <Text style={{ color: theme.primaryText }}>
                        {selected.pinyin}
                      </Text>
                      <Text
                        style={{ color: theme.textSecondary, fontSize: 18 }}
                      >
                        {selected.translation}
                      </Text>
                    </>
                  ) : null}
                  <Text style={{ color: theme.textMuted }}>
                    Đây là bài tự luyện, không phải bài thi có chấm điểm. Phát âm thanh cần có giọng tiếng Trung được cài trên thiết bị.
                  </Text>
                </View>
              ) : null}
            </View>
          ))
        : null}
      <View style={{ gap: 8 }}>
        {offset > 0 ? (
          <PrimaryButton
            label="Trang trước"
            variant="secondary"
            disabled={loading}
            onPress={() => {
              stop();
              setSelected(null);
              setOffset((value) => Math.max(0, value - 20));
            }}
          />
        ) : null}
        {items.length === 20 ? (
          <PrimaryButton
            label="Trang tiếp"
            variant="secondary"
            disabled={loading}
            onPress={() => {
              stop();
              setSelected(null);
              setOffset((value) => value + 20);
            }}
          />
        ) : null}
      </View>
    </Screen>
  );
}
