import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import { deleteReadingDocument, listReadingDocuments, saveReadingDocument, updateReadingPosition,
  type ReadingDocument } from '@/db/reading';
import { copyVocabularyBatchToDeck, findVocabularyByExactHanzi, listPersonalDecks } from "@/db/repository";
import { getStory, getStoryQuestions, recordStoryAnswer, type Story, type StoryQuestion } from '@/db/stories';
import { useStudySession } from '@/hooks/use-study-session';
import { analyzeReaderTokens } from "@/services/reader/analysis";
import { pickTextDocument } from '@/services/reader/document-import';
import { isImageOcrAvailable, recognizeImageText } from '@/services/reader/ocr';
import { readerHanziTerms, segmentReaderText, type ReaderToken } from "@/services/reader/segment";
import type { PersonalDeck } from "@/types/models";

export default function ReaderScreen() {
  const { storyId } = useLocalSearchParams<{ storyId?: string }>();
  return <ReaderContent key={storyId ?? 'custom'} storyId={storyId} />;
}

function ReaderContent({ storyId }: { storyId?: string }) {
  const db = useSQLiteContext();
  useStudySession(db);
  const [text, setText] = useState("");
  const [tokens, setTokens] = useState<ReaderToken[]>([]);
  const [selected, setSelected] = useState<ReaderToken | null>(null);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showVietnamese, setShowVietnamese] = useState(false);
  const [visibleCount, setVisibleCount] = useState(160);
  const [documents, setDocuments] = useState<ReadingDocument[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [question, setQuestion] = useState<StoryQuestion | null>(null);
  const [storyAnswer, setStoryAnswer] = useState<number | null>(null);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [textImportLoading, setTextImportLoading] = useState(false);
  const textImportRequest = useRef<AbortController | null>(null);
  const ocrRequest = useRef<AbortController | null>(null);
  const processingImage = useRef(false);
  const requests = useRef(0);
  const saveLock = useRef(false);
  const metrics = useMemo(() => analyzeReaderTokens(tokens, text), [tokens, text]);

  useFocusEffect(useCallback(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && processingImage.current) { ocrRequest.current?.abort(); setOcrLoading(false); }
    });
    return () => { subscription.remove(); ocrRequest.current?.abort(); textImportRequest.current?.abort(); textImportRequest.current = null; setOcrLoading(false); setTextImportLoading(false); };
  }, []));

  useEffect(() => {
    let live = true;
    void Promise.all([listPersonalDecks(db), listReadingDocuments(db)]).then(([items, history]) => {
      if (!live) return;
      setDecks(items); setDeckId(items[0]?.id ?? ''); setDocuments(history);
    }).catch(() => { if (live) Alert.alert('Chưa tải được thư viện', 'Vui lòng mở lại màn hình.'); });
    return () => { live = false; requests.current += 1; ocrRequest.current?.abort(); textImportRequest.current?.abort(); };
  }, [db]);
  useEffect(() => {
    if (!storyId) return;
    let live = true;
    const request = ++requests.current;
    void Promise.all([getStory(db, storyId), getStoryQuestions(db, storyId)]).then(async ([item, questions]) => {
      if (!live || request !== requests.current || !item) return;
      setStory(item); setText(item.content); setQuestion(questions[0] ?? null); setStoryAnswer(null);
      const vocabulary = await findVocabularyByExactHanzi(db, readerHanziTerms(item.content));
      if (live && request === requests.current) setTokens(segmentReaderText(item.content, vocabulary));
    }).catch(() => { if (live) Alert.alert('Chưa mở được truyện', 'Vui lòng thử lại.'); });
    return () => { live = false; };
  }, [db, storyId]);
  const analyze = async (sourceText = text, resumeIndex = 0) => {
    if (!sourceText.trim()) return;
    const request = ++requests.current;
    setLoading(true);
    try {
      const vocabulary = await findVocabularyByExactHanzi(db, readerHanziTerms(sourceText));
      if (request !== requests.current) return;
      const next = segmentReaderText(sourceText, vocabulary);
      setTokens(next);
      setVisibleCount(Math.max(160, resumeIndex + 1));
      setSelected(next[resumeIndex]?.vocabulary ? next[resumeIndex] : next.find((token) => token.vocabulary) ?? null);
    } catch (error) {
      if (request === requests.current) Alert.alert('Chưa thể phân tích', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally { if (request === requests.current) setLoading(false); }
  };
  const saveDocument = async () => {
    if (saveLock.current || documentId || !tokens.length) return;
    saveLock.current = true; setDocumentSaving(true);
    const request = requests.current;
    try {
      const id = await saveReadingDocument(db, text, tokens, metrics.coveragePercent);
      const history = await listReadingDocuments(db);
      if (request === requests.current) { setDocumentId(id); setDocuments(history); }
    } catch { Alert.alert('Chưa lưu được bài đọc', 'Vui lòng thử lại.'); }
    finally { saveLock.current = false; if (request === requests.current) setDocumentSaving(false); }
  };
  const saveToDeck = async () => {
    if (!selected?.vocabulary || !deckId || saving) return;
    setSaving(true);
    try {
      const outcome = await copyVocabularyBatchToDeck(db, deckId, [selected.vocabulary]);
      Alert.alert(outcome.saved ? "Đã thêm vào bộ từ" : "Từ đã có trong bộ", outcome.saved ? `Đã thêm ${selected.vocabulary.simplified}.` : "Không tạo từ trùng lặp.");
    } catch { Alert.alert('Chưa thêm được từ', 'Vui lòng thử lại.'); }
    finally { setSaving(false); }
  };
  const importImage = async () => {
    if (ocrRequest.current || textImportRequest.current || documentSaving) return;
    const controller = new AbortController(); ocrRequest.current = controller; setOcrLoading(true);
    try {
      const image = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (controller.signal.aborted || image.canceled || !image.assets[0]) return;
      processingImage.current = true;
      const result = await recognizeImageText(image.assets[0].uri, controller.signal);
      if (controller.signal.aborted) return;
      requests.current += 1; setLoading(false);
      setText(result.text); setTokens([]); setSelected(null); setDocumentId(null);
      Alert.alert('Đã nhận chữ từ ảnh', `${result.truncated ? 'Đã lấy 2.000 ký tự đầu. ' : ''}Hãy kiểm tra/sửa chữ rồi nhấn Tách và tra từ; chưa có từ nào được tự động lưu.`);
    } catch (error) {
      if (!controller.signal.aborted) Alert.alert('Chưa nhập được ảnh', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      ocrRequest.current = null;
      processingImage.current = false;
      if (!controller.signal.aborted) setOcrLoading(false);
    }
  };
  const importTxt = async () => {
    if (ocrRequest.current || textImportRequest.current || documentSaving) return;
    const controller = new AbortController();
    textImportRequest.current = controller; setTextImportLoading(true);
    try {
      const result = await pickTextDocument(controller.signal);
      if (!result || controller.signal.aborted) return;
      requests.current++; setLoading(false);
      setText(result.text); setTokens([]); setSelected(null); setDocumentId(null);
      Alert.alert('Đã mở TXT', `${result.truncated ? 'Đã lấy 2.000 ký tự đầu. ' : ''}Kiểm tra nội dung rồi bấm Tách và tra từ. Chưa tự động lưu dữ liệu.`);
    } catch (error) {
      if (!controller.signal.aborted) Alert.alert('Chưa mở được TXT', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      if (textImportRequest.current === controller) textImportRequest.current = null;
      if (!controller.signal.aborted) setTextImportLoading(false);
    }
  };
  return <Screen title={story?.title ?? 'Đọc & tra từ'} subtitle="Chạm cụm từ để tra kho offline và thêm vào bộ từ riêng.">
    {story ? <View style={card}><Text style={styles.title}>{story.content}</Text></View> : null}
    <View style={[card, styles.form]}>
      {!story && <PrimaryButton variant="secondary" label="Nhập tệp TXT" disabled={documentSaving || ocrLoading} loading={textImportLoading} onPress={() => void importTxt()} />}
      {textImportLoading ? <PrimaryButton variant="ghost" label="Hủy nhập TXT" onPress={() => {
        textImportRequest.current?.abort(); textImportRequest.current = null; setTextImportLoading(false);
      }} /> : null}
      {!story && <PrimaryButton variant="secondary" label={isImageOcrAvailable() ? 'Nhận chữ từ ảnh' : 'OCR cần APK hỗ trợ · có thể dán chữ bên dưới'} disabled={!isImageOcrAvailable() || documentSaving || textImportLoading} loading={ocrLoading} onPress={() => void importImage()} />}
      <TextInput value={text} editable={!story && !documentSaving && !ocrLoading && !textImportLoading} onChangeText={(value) => { requests.current += 1; setLoading(false); setText(Array.from(value).slice(0, 2000).join('')); setTokens([]); setSelected(null); setDocumentId(null); }} placeholder="Ví dụ: 我正在学习中文。" placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" autoCorrect={false} style={styles.input} />
      <Text style={styles.counter}>{Array.from(text).length}/2000 ký tự</Text>
      <PrimaryButton label="Tách và tra từ" loading={loading} disabled={!text.trim() || documentSaving || ocrLoading || textImportLoading} onPress={() => void analyze()} />
      {tokens.length && !documentId ? <PrimaryButton variant="secondary" label="Lưu bài đọc" disabled={ocrLoading || textImportLoading} loading={documentSaving}
        onPress={() => void saveDocument()} /> : null}
    </View>
    {tokens.length ? <View style={[card, styles.tokens]}>
      <Text style={styles.title}>Độ phủ {metrics.coveragePercent}% · {metrics.difficulty}</Text>
      <Text style={styles.counter}>{metrics.totalWords} từ · {metrics.knownWords} đã biết · {metrics.learningWords} đang học · {metrics.unknownWords} chưa học · HSK ước tính {metrics.estimatedHsk}</Text>
      <View style={styles.toggleRow}>
        <Pressable accessibilityRole="button" onPress={() => setShowPinyin((value) => !value)}><Text style={styles.toggle}>Pinyin {showPinyin ? '✓' : '○'}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShowVietnamese((value) => !value)}><Text style={styles.toggle}>Tiếng Việt {showVietnamese ? '✓' : '○'}</Text></Pressable>
      </View>
      <Text style={styles.counter}>Chạm từ để tra; màu xanh: đã biết, vàng: đang học, xám: chưa học.</Text>
      <View style={styles.tokenWrap}>{tokens.slice(0, visibleCount).map((token, index) => <Pressable key={`${token.text}-${index}`}
        disabled={!token.vocabulary} onPress={() => { setSelected(token); if (documentId) void updateReadingPosition(db, documentId, index)
          .catch(() => Alert.alert('Chưa lưu được vị trí đọc', 'Bạn vẫn có thể tiếp tục đọc.')); }}
        style={[styles.token, token.vocabulary?.status === 'KNOWN' ? styles.tokenKnown :
          token.vocabulary?.status === 'LEARNING' ? styles.tokenLearning : styles.tokenUnknown,
        selected === token && styles.tokenActive]}>
        <Text style={[styles.tokenText, !token.vocabulary && styles.tokenUnknownText]}>{token.text}</Text>
        {showPinyin && token.vocabulary ? <Text style={styles.tokenSub}>{token.vocabulary.pinyin}</Text> : null}
        {showVietnamese && token.vocabulary ? <Text style={styles.tokenSub}>{token.vocabulary.primaryMeaningVi}</Text> : null}
      </Pressable>)}</View>
      {tokens.length > visibleCount ? <Pressable accessibilityRole="button" onPress={() => setVisibleCount((count) => count + 160)}>
        <Text style={styles.toggle}>Hiển thị thêm ({Math.min(visibleCount, tokens.length)}/{tokens.length})</Text>
      </Pressable> : null}
    </View> : null}
    {selected?.vocabulary ? <View style={[card, styles.detail]}>
      <Text style={styles.hanzi}>{selected.vocabulary.simplified}</Text><PinyinText value={selected.vocabulary.pinyin} style={styles.pinyin} /><Text style={styles.meaning}>{selected.vocabulary.primaryMeaningVi}</Text><Text style={styles.meta}>HSK {selected.vocabulary.hskBand} · {selected.vocabulary.status === "LEARNING" ? "Đang học" : selected.vocabulary.status === "KNOWN" ? "Đã biết" : selected.vocabulary.status === "SKIPPED" ? "Đã bỏ qua" : "Mới"}</Text>
      <PrimaryButton variant="ghost" label="Mở chi tiết từ" onPress={() => router.push(`/word/${selected.vocabulary?.id}` as Href)} />
      {decks.length ? <><Text style={styles.deckLabel}>THÊM VÀO BỘ TỪ</Text><View style={styles.deckChoices}>{decks.map((deck) => <Pressable key={deck.id} onPress={() => setDeckId(deck.id)} style={[styles.deckChoice, deckId === deck.id && styles.deckChoiceActive]}><Text style={[styles.deckText, deckId === deck.id && styles.deckTextActive]}>{deck.name}</Text></Pressable>)}</View><PrimaryButton label="Thêm vào bộ từ" loading={saving} onPress={() => void saveToDeck()} /></> : <PrimaryButton variant="secondary" label="Tạo bộ từ để lưu" onPress={() => router.push("/decks" as Href)} />}
    </View> : null}
    {text.trim() && !loading && tokens.length === 0 ? <EmptyState title="Chưa có từ để hiển thị" message="Nhấn “Tách và tra từ” để dùng kho từ offline." /> : null}
    {story && question ? <View style={[card, styles.tokens]}>
      <Text style={styles.title}>Kiểm tra đọc hiểu</Text><Text>{question.prompt_vi}</Text>
      {(JSON.parse(question.choices_json) as string[]).map((choice, index) => <Pressable key={choice}
        accessibilityRole="button" disabled={storyAnswer !== null || saving} style={styles.deckChoice}
        onPress={() => {
          setSaving(true);
          void recordStoryAnswer(db, story.id, index === question.correct_index).then(() => setStoryAnswer(index))
            .catch(() => Alert.alert('Chưa lưu được', 'Vui lòng thử lại.')).finally(() => setSaving(false));
        }}><Text>{choice}</Text></Pressable>)}
      {storyAnswer !== null ? <Text style={styles.toggle}>{storyAnswer === question.correct_index ? 'Chính xác!' :
        `Đáp án: ${(JSON.parse(question.choices_json) as string[])[question.correct_index]}`}</Text> : null}
    </View> : null}
    {documents.length ? <View style={[card, styles.tokens]}><Text style={styles.title}>Bài đọc đã lưu</Text>
      {documents.map((document) => <View key={document.id} style={styles.savedRow}>
        <Pressable accessibilityRole="button" disabled={documentSaving || ocrLoading || textImportLoading} style={styles.savedTitle} onPress={() => {
          setStory(null); setQuestion(null); setStoryAnswer(null); setTokens([]); setSelected(null);
          setText(document.content); setDocumentId(document.id);
          void analyze(document.content, document.last_token_index);
        }}><Text style={styles.title}>{document.title}</Text>
          <Text style={styles.counter}>Độ phủ {document.coverage_percent}% · {new Date(document.updated_at).toLocaleDateString('vi-VN')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={documentSaving} onPress={() => Alert.alert('Xóa bài đọc?', 'Bài sẽ được ẩn khỏi lịch sử, không ảnh hưởng từ đã học.', [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Xóa', style: 'destructive', onPress: () => void deleteReadingDocument(db, document.id).then(async () => {
            if (documentId === document.id) setDocumentId(null);
            setDocuments(await listReadingDocuments(db));
          }).catch(() => Alert.alert('Chưa xóa được bài đọc', 'Vui lòng thử lại.')) },
        ])}><Text style={styles.deleteText}>Xóa</Text></Pressable>
      </View>)}
    </View> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm }, input: { minHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.background, color: colors.text, fontSize: 17, lineHeight: 26, padding: spacing.md }, counter: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
  tokens: { gap: spacing.sm }, title: { color: colors.text, fontSize: 17, fontWeight: "900" }, tokenWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, token: { borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 }, tokenKnown: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, tokenLearning: { borderColor: '#e0a426', backgroundColor: '#fff6d9' }, tokenUnknown: { borderColor: colors.border, backgroundColor: colors.background }, tokenActive: { borderWidth: 2, borderColor: colors.primary }, tokenText: { color: colors.primary, fontWeight: "800", fontSize: 16 }, tokenUnknownText: { color: colors.textMuted }, tokenSub: { color: colors.textMuted, fontSize: 11, maxWidth: 110 }, toggleRow: { flexDirection: 'row', gap: spacing.lg }, toggle: { color: colors.primary, fontWeight: '800' },
  detail: { gap: spacing.sm }, hanzi: { color: colors.text, fontSize: 44, fontWeight: "900" }, pinyin: { fontSize: 20 }, meaning: { color: colors.text, fontSize: 20, fontWeight: "800" }, meta: { color: colors.textMuted, fontSize: 12 }, deckLabel: { color: colors.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: spacing.sm }, deckChoices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, deckChoice: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 8 }, deckChoiceActive: { backgroundColor: colors.primary, borderColor: colors.primary }, deckText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" }, deckTextActive: { color: "#fff" },
  savedRow: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm },
  savedTitle: { flex: 1 }, deleteText: { color: '#c43b3b', fontWeight: '700' },
});
