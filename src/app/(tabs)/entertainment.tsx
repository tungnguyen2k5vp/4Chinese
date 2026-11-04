import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Screen } from "@/components/Screen";
import { EnglishQuickDictionary } from "@/components/english/EnglishQuickDictionary";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { lookupSkypedia } from "@/db/english/skypedia";
import { normalizeChainWord, pickDictionaryChainWord, validateWordChainGuess, type WordChainDifficulty } from "@/services/english/word-chain";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { EnglishAvailability } from "@/services/languages/LanguageRuntime";
import { getSkypediaDictionary } from "@/services/languages/skypedia-runtime";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

type Round = { headword: string; owner: "YOU" | "APP" };

export default function EnglishEntertainmentTab() {
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  if (preferences.learningLanguage !== "en") return <Screen title="Trò chơi"><Text style={{ color: theme.textPrimary }}>Tab này chỉ dùng trong chế độ tiếng Anh.</Text></Screen>;
  return <EnglishAvailability><EnglishWordChain /></EnglishAvailability>;
}

function EnglishWordChain() {
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [difficulty, setDifficulty] = useState<WordChainDifficulty>("easy");
  const [source, setSource] = useState<Awaited<ReturnType<typeof getSkypediaDictionary>> | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("");
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dictionaryQuery, setDictionaryQuery] = useState("");
  const working = useRef(false);
  const [help, setHelp] = useState(false);
  const [hint, setHint] = useState('');

  const used = new Set(rounds.map((row) => normalizeChainWord(row.headword)));
  const lastWord = rounds[rounds.length - 1]?.headword ?? "";
  const requiredLetter = lastWord ? lastWord.slice(-1) : "";
  const userWords = rounds.filter((row) => row.owner === "YOU").map((row) => row.headword);
  const startGame = async () => {
    if (working.current) return;
    working.current = true;
    setLoading(true);
    setMessage("");
    setInput("");
    setHint('');
    try {
      const dictionary = await getSkypediaDictionary();
      const first = await pickDictionaryChainWord(dictionary, "a", new Set(), difficulty);
      if (!first) throw new Error("Không tìm được từ bắt đầu trong bộ từ điển cục bộ.");
      setSource(dictionary);
      setRounds([{ headword: first, owner: "APP" }]);
      setScore(0);
      setPlaying(true);
      setMessage("Đến lượt bạn. Chọn một mục từ có trong từ điển và bắt đầu bằng chữ cái cuối của từ hiện tại.");
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : "Chưa mở được bộ từ điển. Hãy kết nối mạng để tải bản riêng trên thiết bị lần đầu.");
    } finally {
      working.current = false;
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!playing || !source || working.current) return;
    const check = validateWordChainGuess(input, lastWord, used, difficulty);
    if (!check.valid) {
      const messages = {
        empty: "Nhập một từ trước.",
        characters: "Chỉ dùng một từ tiếng Anh gồm chữ cái A–Z.",
        "wrong-letter": `Từ tiếp theo cần bắt đầu bằng “${requiredLetter}”.`,
        "too-short": 'Nhập từ có ít nhất hai chữ cái.',
        "already-used": "Từ này đã được dùng trong ván.",
      };
      setMessage(messages[check.reason]);
      return;
    }
    working.current = true;
    setLoading(true);
    setMessage("");
    try {
      const meaning = await lookupSkypedia(source, check.word);
      if (!meaning.length) {
        setMessage(`“${check.word}” không có trong từ điển hiện đã tải; chưa tính điểm.`);
        return;
      }
      const afterUser: Round[] = [...rounds, { headword: check.word, owner: "YOU" }];
      const usedAfterUser = new Set([...used, check.word]);
      setScore((value) => value + check.points);
      setInput("");
      setHint('');
      if (userWords.length + 1 >= 10) {
        setRounds(afterUser);
        setPlaying(false);
        setMessage("Bạn đã hoàn thành 10 lượt từ. Điểm trò chơi không làm thay đổi XP hay lịch ôn SRS.");
        return;
      }
      const reply = await pickDictionaryChainWord(source, check.word.at(-1) ?? "", usedAfterUser, difficulty);
      if (!reply) {
        setRounds(afterUser);
        setPlaying(false);
        setMessage("Không còn mục từ phù hợp trong danh sách tra cứu cục bộ. Bạn thắng ván này; không có tiến độ SRS nào được thay đổi.");
        return;
      }
      setRounds([...afterUser, { headword: reply, owner: "APP" }]);
      setMessage("Đến lượt bạn.");
    } catch {
      setMessage("Chưa tra được từ trong cơ sở dữ liệu từ điển. Ván và dữ liệu học vẫn được giữ nguyên.");
    } finally {
      working.current = false;
      setLoading(false);
    }
  };

  const lookup = (word: string) => { setDictionaryQuery(word); setDictionaryOpen(true); };
  return (
    <Screen title="Giải trí" subtitle="Nối từ tiếng Anh · chơi và khám phá từ mới." avoidKeyboard>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: help }} onPress={() => setHelp(value => !value)} style={{ minHeight: 44 }}><Text style={{ color: p.primary }}>Luật chơi {help ? '−' : '+'}</Text></Pressable>
      {help ? <View style={[s.banner, { backgroundColor: p.cefrLight }]}>
        <Ionicons name="game-controller" size={26} color={p.cefr} />
        <Text style={{ color: p.textSecondary, flex: 1, lineHeight: 20 }}>Mỗi từ mới phải có trong từ điển, bắt đầu bằng chữ cái cuối của từ trước và không được lặp. Trò chơi không tạo thẻ hoặc thay đổi lịch SRS.</Text>
      </View> : null}
      <Text style={[s.section, { color: p.textPrimary }]}>Word Chain · Offline</Text>
      <View style={s.difficulty}>
        {(["easy", "normal", "hard"] as const).map((level) => <Pressable key={level} accessibilityRole="radio" accessibilityState={{ selected: difficulty === level }} disabled={playing} onPress={() => setDifficulty(level)} style={[s.level, { backgroundColor: difficulty === level ? p.primary : p.surfaceSubtle }]}><Text style={{ color: difficulty === level ? "white" : p.textPrimary, fontWeight: "800" }}>{level === "easy" ? "Dễ · quen thuộc" : level === "normal" ? "Vừa · mở rộng" : "Khó · thử thách"}</Text></Pressable>)}
      </View>
      <View style={[s.game, { backgroundColor: p.surface, borderColor: p.border }]}>
        <View style={s.top}><Text style={[s.label, { color: p.cefr }]}>TỪ ĐÃ NỐI · {rounds.length}</Text><AnimatedNumber testID="word-chain-score" value={score} suffix=" điểm trò chơi" style={[s.score, { color: p.primary }]} /></View>
        {rounds.length ? <StudyTransition turnKey={`${rounds.length}:${lastWord}`} effect="reveal" testID="word-chain-reply" style={[s.current, { backgroundColor: p.primaryLight }]}><Text style={[s.currentLabel, { color: p.primary }]}>{playing ? `BẮT ĐẦU BẰNG “${requiredLetter.toUpperCase()}”` : "VÁN ĐÃ KẾT THÚC"}</Text><MotionPressable accessibilityLabel={`Tra từ ${lastWord}`} onPress={() => lookup(lastWord)}><Text testID="english-word-chain-current" style={[s.currentWord, { color: p.textPrimary }]}>{lastWord}</Text></MotionPressable></StudyTransition> : <Text style={{ color: p.textSecondary }}>Bắt đầu ván mới. Từ mở đầu được lấy từ từ điển cục bộ.</Text>}
        {playing ? <View style={s.entry}><TextInput accessibilityLabel="Từ tiếp theo trong trò chơi Word Chain" autoCapitalize="none" autoCorrect={false} value={input} onChangeText={setInput} onSubmitEditing={() => void submit()} returnKeyType="go" placeholder={`Từ bắt đầu bằng ${requiredLetter}`} placeholderTextColor={p.textMuted} style={[s.input, { backgroundColor: p.surfaceSubtle, borderColor: p.border, color: p.textPrimary }]} /><Pressable accessibilityRole="button" disabled={loading || !input.trim()} onPress={() => void submit()} style={[s.submit, { backgroundColor: p.primary, opacity: loading || !input.trim() ? 0.5 : 1 }]}><Text style={s.submitText}>{loading ? "…" : "Nối từ"}</Text></Pressable></View> : <Pressable accessibilityRole="button" disabled={loading} onPress={() => void startGame()} style={[s.start, { backgroundColor: p.primary }]}><Text style={s.submitText}>{loading ? "Đang tải từ điển…" : rounds.length ? "Chơi lại" : "Bắt đầu chơi"}</Text></Pressable>}
        {message ? <StudyTransition turnKey={message} effect="reveal" testID="word-chain-notice"><Text accessibilityLiveRegion="polite" style={{ color: p.textSecondary, lineHeight: 21 }}>{message}</Text></StudyTransition> : null}
        {playing ? <View style={{ gap: 10 }}><Pressable accessibilityRole="button" disabled={loading} onPress={() => { if (source) void pickDictionaryChainWord(source, requiredLetter, used, difficulty).then(word => setHint(word ?? 'Chưa có gợi ý trong bộ từ của mức này.')).catch(() => setHint('Chưa tra được gợi ý.')); }} style={{ minHeight: 44 }}><Text style={{ color: p.primary }}>Gợi ý từ tiếp theo</Text></Pressable>{hint ? <Text style={{ color: p.textSecondary }}>{hint}</Text> : null}<Pressable accessibilityRole="button" disabled={loading} onPress={() => { setPlaying(false); setMessage('Ván đã dừng. Chạm từ đã gặp để tra và tự lưu.'); }} style={{ minHeight: 44 }}><Text style={{ color: p.primary }}>Kết thúc ván</Text></Pressable></View> : null}
      </View>
      {rounds.length ? <View style={[s.history, { backgroundColor: p.surface, borderColor: p.border }]}><Text style={[s.section, { color: p.textPrimary }]}>Từ đã gặp · chạm để tra/lưu</Text>{rounds.slice().reverse().map((row, index) => <StudyTransition key={row.headword} turnKey={row.headword} effect="reveal" animateOnMount={index < 2}><MotionPressable accessibilityLabel={`Tra từ ${row.headword}, ${row.owner === 'YOU' ? 'bạn đã nhập' : 'từ điển chọn'}`} onPress={() => lookup(row.headword)} style={[s.row, { borderColor: p.border }]}><View style={{ flex: 1 }}><Text style={[s.historyWord, { color: p.textPrimary }]}>{row.headword}</Text><Text style={{ color: p.textMuted }}>{row.owner === "YOU" ? "Bạn đã nhập" : "Từ điển chọn"}</Text></View><Ionicons name="search" size={19} color={p.primary} /></MotionPressable></StudyTransition>)}{userWords.length > 0 ? <Text style={{ color: p.textMuted, fontSize: 12 }}>Từ của bạn chỉ được lưu nếu bạn tự chọn nghĩa và bộ trong tra từ.</Text> : null}</View> : null}
      {dictionaryOpen ? <EnglishQuickDictionary initialQuery={dictionaryQuery} onClose={() => setDictionaryOpen(false)} /> : null}
    </Screen>
  );
}

const s = StyleSheet.create({ banner: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 16 }, section: { fontSize: 19, fontWeight: "900" }, difficulty: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, level: { minHeight: 42, paddingHorizontal: 12, borderRadius: 13, justifyContent: "center" }, game: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 }, top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }, label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.5 }, score: { fontSize: 13, fontWeight: "800" }, current: { padding: 20, borderRadius: 16, alignItems: "center", gap: 6 }, currentLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 1 }, currentWord: { fontSize: 36, lineHeight: 44, fontWeight: "900" }, entry: { flexDirection: "row", gap: 8 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flex: 1, fontSize: 16 }, submit: { minHeight: 50, paddingHorizontal: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" }, submitText: { color: "white", fontWeight: "900", fontSize: 15 }, start: { minHeight: 52, borderRadius: 15, alignItems: "center", justifyContent: "center" }, history: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 }, row: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, historyWord: { fontWeight: "800", fontSize: 16 } });
