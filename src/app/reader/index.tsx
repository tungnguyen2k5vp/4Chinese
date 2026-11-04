import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ChineseAIEntry, WordAIEntry } from "@/components/ChineseAIEntry";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Disclosure } from "@/components/chinese/Disclosure";
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { card as baseCard, radius, spacing, typography } from "@/constants/design";
import { recordLessonActivityEvidence } from '@/db/learning-path';
import { deleteReadingDocument, getReadingDocumentChunk, getReadingDocumentLayout,
  listReadingDocuments, saveReadingDocument, updateReadingCharacterPosition,
  type ReadingDocument } from '@/db/reading';
import { copyVocabularyBatchToDeck, findVocabularyByExactHanzi, listPersonalDecks } from "@/db/repository";
import { getStory, getStoryQuestions, recordStoryAnswer, type Story, type StoryQuestion } from '@/db/stories';
import type { ContextSource } from '@/db/vocabulary-context';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import { useStudySession } from '@/hooks/use-study-session';
import { analyzeReaderTokens } from "@/services/reader/analysis";
import { analyzeReaderChunk, ReaderWorkCanceled } from '@/services/reader/chunk-analysis';
import { pickReaderDocument } from '@/services/reader/document-import';
import { isImageOcrAvailable, recognizeImageText } from '@/services/reader/ocr';
import { decodeReaderPosition, MAX_READER_CHARACTERS, READER_CHUNK_CHARACTERS,
  splitReaderChunks, splitReaderTextWithTokens, type LocatedReaderToken, type ReaderChunk } from '@/services/reader/pages';
import { normalizeImportedText } from '@/services/reader/text-import';
import { saveReaderWordContext } from '@/services/reader/word-context';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { ThemeTokens } from '@/theme/tokens';
import { visualModePresentation } from '@/theme/visual-modes';
import type { PersonalDeck } from "@/types/models";

export default function ReaderScreen() {
  const { storyId, lessonActivityId } = useLocalSearchParams<{ storyId?: string; lessonActivityId?: string }>();
  return <ReaderContent key={storyId ?? 'custom'} storyId={storyId} lessonActivityId={lessonActivityId} />;
}

function ReaderContent({ storyId, lessonActivityId }: { storyId?: string; lessonActivityId?: string }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { ask, dialog } = useConfirmation();
  const readingMode = visualModePresentation(theme, 'READ');
  const modalAnimation = useModalAnimationType();
  const db = useSQLiteContext();
  useStudySession(db);
  const [text, setText] = useState("");
  const [tokens, setTokens] = useState<LocatedReaderToken[]>([]);
  const [selected, setSelected] = useState<LocatedReaderToken | null>(null);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [loading, setLoading] = useState(!!storyId);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savePersonalContext, setSavePersonalContext] = useState(false);
  const [chunk, setChunk] = useState<ReaderChunk | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [documentTitle, setDocumentTitle] = useState('');
  const [loadError, setLoadError] = useState('');
  const draftChunks = useRef<ReaderChunk[]>([]);
  const characterPosition = useRef(0);
  const pageRequest = useRef<AbortController | null>(null);
  const documentSaveRequest = useRef<AbortController | null>(null);
  const scroll = useRef<ScrollView | null>(null);
  const scrollPosition = useRef(0);
  const positionWrites = useRef<Promise<void>>(Promise.resolve());
  const [inputError, setInputError] = useState('');
  const [inputCharacters, setInputCharacters] = useState(0);
  const inputSource = useRef<ContextSource>('READER');
  const [initialDraftSourceId] = useState(() => `reader-draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const draftSourceId = useRef(initialDraftSourceId);
  const wordSaveLock = useRef(false);
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
  const pickingImage = useRef(false);
  const pickingText = useRef(false);
  const requests = useRef(0);
  const saveLock = useRef(false);
  const metrics = useMemo(() => analyzeReaderTokens(tokens, chunk?.content ?? ''), [tokens, chunk]);
  const readingSegments = useMemo(() => splitReaderTextWithTokens(chunk?.content ?? '', tokens), [chunk, tokens]);
  const busy = loading || documentSaving || ocrLoading || textImportLoading;

  useFocusEffect(useCallback(() => {
    scroll.current?.scrollTo({ y: scrollPosition.current, animated: false });
    const cancel = () => {
      requests.current++;
      if (pageRequest.current) setLoadError('Đã hủy tra từ. Bạn có thể thử lại phần hiện tại.');
      pageRequest.current?.abort(); pageRequest.current = null;
      ocrRequest.current?.abort(); textImportRequest.current?.abort();
      documentSaveRequest.current?.abort(); setDocumentSaving(false);
      setLoading(false); setOcrLoading(false); setTextImportLoading(false);
    };
    const subscription = AppState.addEventListener('change', (state) => {
      // Native system pickers may background this Activity; do not cancel the user's selection.
      // Once the picker hands us a cache copy/image, backgrounding cancels processing normally.
      if (state !== 'active' && !pickingImage.current && !pickingText.current) cancel();
    });
    return () => { subscription.remove(); cancel(); };
  }, []));

  useEffect(() => {
    let live = true;
    void Promise.all([listPersonalDecks(db), listReadingDocuments(db)]).then(([items, history]) => {
      if (!live) return;
      setDecks(items); setDeckId(items[0]?.id ?? ''); setDocuments(history);
    }).catch(() => { if (live) Alert.alert('Chưa tải được thư viện', 'Vui lòng mở lại màn hình.'); });
    return () => { live = false; requests.current += 1; pageRequest.current?.abort(); documentSaveRequest.current?.abort(); ocrRequest.current?.abort(); textImportRequest.current?.abort(); };
  }, [db]);
  const persistPosition = (id: string | null, offset: number) => {
    characterPosition.current = offset;
    if (!id) return;
    // Serialize writes so rapid taps/pages cannot durably restore an older position.
    positionWrites.current = positionWrites.current.catch(() => undefined)
      .then(() => updateReadingCharacterPosition(db, id, offset))
      .catch(() => Alert.alert('Chưa lưu được vị trí đọc', 'Bạn vẫn có thể tiếp tục đọc; hãy thử lại trước khi đóng app.'));
  };
  const loadChunk = useCallback(async (nextChunk: ReaderChunk, offset = nextChunk.char_start, legacyIndex = -1) => {
    pageRequest.current?.abort();
    const controller = new AbortController(); pageRequest.current = controller;
    const request = ++requests.current;
    setLoading(true); setLoadError(''); setTokens([]); setSelected(null); setSavePersonalContext(false); setChunk(nextChunk);
    try {
      const next = await analyzeReaderChunk(nextChunk, (terms) => findVocabularyByExactHanzi(db, terms), controller.signal);
      if (request !== requests.current || controller.signal.aborted) return;
      setTokens(next);
      const localOffset = legacyIndex >= 0 ? -1 : offset - nextChunk.char_start;
      const target = legacyIndex >= 0 ? next[legacyIndex] : next.find((token) => token.charEnd > localOffset);
      setSelected(null);
      characterPosition.current = legacyIndex >= 0 ? nextChunk.char_start + (target?.charStart ?? 0) : offset;
      if (next.length && lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "READING_TOKENS_ANALYZED", storyId ?? next[0]!.text).catch(() => undefined);
    } catch (error) {
      if (request === requests.current && !(error instanceof ReaderWorkCanceled)) setLoadError(error instanceof Error ? error.message : 'Chưa thể tra từ. Hãy thử lại.');
    } finally {
      if (pageRequest.current === controller) pageRequest.current = null;
      if (request === requests.current) setLoading(false);
    }
  }, [db, lessonActivityId, storyId]);
  useEffect(() => {
    if (!storyId) return;
    let live = true;
    const request = ++requests.current;
    void Promise.all([getStory(db, storyId), getStoryQuestions(db, storyId)]).then(async ([item, questions]) => {
      if (!live || request !== requests.current || !item) return;
      const chunks = splitReaderChunks(item.content);
      draftChunks.current = chunks;
      setStory(item); setText(item.content); setQuestion(questions[0] ?? null); setStoryAnswer(null);
      setChunkCount(chunks.length); setCharacterCount(Array.from(item.content).length);
      if (chunks[0]) await loadChunk(chunks[0]);
    }).catch(() => { if (live) setLoadError('Chưa mở được truyện. Vui lòng mở lại màn hình.'); })
      .finally(() => { if (live && request === requests.current) setLoading(false); });
    return () => { live = false; };
  }, [db, storyId, loadChunk]);
  const analyze = async () => {
    if (busy) return;
    try {
      const result = normalizeImportedText(text, 'TEXT');
      const chunks = splitReaderChunks(result.text);
      draftChunks.current = chunks;
      setText(result.text); setDocumentId(null); setInputError('');
      setChunkCount(chunks.length); setCharacterCount(Array.from(result.text).length);
      if (chunks[0]) await loadChunk(chunks[0]);
    } catch (error) { setInputError(error instanceof Error ? error.message : 'Văn bản không hợp lệ.'); }
  };
  const navigateChunk = async (index: number) => {
    if (busy || index < 0 || index >= chunkCount) return;
    const request = ++requests.current;
    setLoading(true); setLoadError('');
    try {
      const next = documentId ? await getReadingDocumentChunk(db, documentId, index) : draftChunks.current[index];
      if (request !== requests.current) return;
      if (!next) throw new Error('Không tìm thấy phần văn bản. Hãy mở lại bài đọc.');
      await loadChunk(next);
      if (requests.current === request + 1) persistPosition(documentId, next.char_start);
    } catch (error) { if (request === requests.current) setLoadError(error instanceof Error ? error.message : 'Chưa mở được phần này.'); }
    finally { if (request === requests.current) setLoading(false); }
  };
  const saveDocument = async () => {
    if (saveLock.current || documentId || !chunk || busy) return;
    saveLock.current = true; setDocumentSaving(true);
    const controller = new AbortController(); documentSaveRequest.current = controller;
    const request = requests.current;
    try {
      // Page-only metrics/tokens are not whole-document coverage or occurrence counts.
      const id = await saveReadingDocument(db, text, chunkCount === 1 ? tokens : [], chunkCount === 1 ? metrics.coveragePercent : 0,
        documentTitle || story?.title, { signal: controller.signal, characterOffset: characterPosition.current });
      const history = await listReadingDocuments(db);
      if (request === requests.current) { setDocumentId(id); setDocuments(history); }
    } catch { if (!controller.signal.aborted) Alert.alert('Chưa lưu được bài đọc', 'Vui lòng thử lại.'); }
    finally { documentSaveRequest.current = null; saveLock.current = false; if (request === requests.current) setDocumentSaving(false); }
  };
  const openDocument = async (document: ReadingDocument) => {
    if (busy) return;
    setShowImport(false);
    const request = ++requests.current;
    setLoading(true); setStory(null); setQuestion(null); setStoryAnswer(null); setTokens([]); setSelected(null);
    try {
      await positionWrites.current;
      const layout = await getReadingDocumentLayout(db, document.id);
      if (request !== requests.current) return;
      if (!layout) throw new Error('Không tìm thấy bài đọc.');
      const resume = decodeReaderPosition(layout.last_token_index);
      const offset = Math.min(resume.characterOffset ?? 0, Math.max(0, layout.character_count - 1));
      const content = await getReadingDocumentChunk(db, document.id, Math.floor(offset / READER_CHUNK_CHARACTERS));
      if (request !== requests.current) return;
      if (!content) throw new Error('Không tìm thấy phần văn bản.');
      setText(''); draftChunks.current = []; setDocumentId(document.id); setDocumentTitle(document.title);
      inputSource.current = 'READER';
      setChunkCount(layout.chunk_count); setCharacterCount(layout.character_count);
      await loadChunk(content, offset, resume.characterOffset === null ? resume.legacyTokenIndex : -1);
    } catch {
      if (request === requests.current) setLoadError('Chưa mở được bài đọc. Hãy thử mở lại từ lịch sử.');
    } finally { if (request === requests.current) setLoading(false); }
  };
  const saveToDeck = async () => {
    if (!selected?.vocabulary || !chunk || !deckId || wordSaveLock.current || busy) return;
    wordSaveLock.current = true; setSaving(true);
    const token = selected;
    const sourceChunk = chunk;
    const sourceId = story?.id ?? documentId ?? lessonActivityId ?? draftSourceId.current;
    const sourceType = story ? 'STORY' : lessonActivityId ? 'LESSON' : inputSource.current;
    const tokenIndex = tokens.indexOf(selected);
    try {
      const outcome = await copyVocabularyBatchToDeck(db, deckId, [selected.vocabulary]);
      // Saving an already-present word may still attach a new personal encounter.
      let contextFailed = false;
      if (savePersonalContext) {
        try {
          await saveReaderWordContext(db, { vocabularyId: token.vocabulary!.id, chunk: sourceChunk,
            localCharacterOffset: token.charStart, tokenIndex, documentId, draftText: text, sourceType, sourceId,
            userConfirmed: true, deckCopy: { deckId, word: token.vocabulary! } });
        } catch { contextFailed = true; }
      }
      Alert.alert(outcome.saved ? "Đã thêm vào bộ từ" : "Từ đã có trong bộ",
        `${outcome.saved ? `Đã thêm ${token.vocabulary!.simplified}.` : 'Không tạo từ trùng lặp.'} ${contextFailed
          ? 'Từ vẫn đã lưu, nhưng chưa lưu được câu ngữ cảnh. Hãy thử lại.' : savePersonalContext
            ? 'Đã lưu câu ngữ cảnh riêng trên thiết bị.' : 'Không lưu câu ngữ cảnh vì bạn chưa chọn.'}`);
    } catch { Alert.alert('Chưa thêm được từ', 'Vui lòng thử lại.'); }
    finally { wordSaveLock.current = false; setSaving(false); setSavePersonalContext(false); }
  };
  const editDraft = (clear = false, enterComposer = true) => {
    setShowImport(enterComposer);
    requests.current++; pageRequest.current?.abort(); setLoading(false); setLoadError(''); setInputError('');
    setChunk(null); setTokens([]); setSelected(null); setDocumentId(null); draftChunks.current = [];
    if (clear) {
      setText(''); setInputCharacters(0); setDocumentTitle(''); inputSource.current = 'READER';
      draftSourceId.current = `reader-draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    } else setInputCharacters(Array.from(text).length);
  };
  const importImage = async (camera = false) => {
    if (ocrRequest.current || textImportRequest.current || busy || saving) return;
    setShowImport(true);
    const controller = new AbortController(); ocrRequest.current = controller; setOcrLoading(true); pickingImage.current = true;
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Chưa được cấp quyền camera. Bạn có thể chọn ảnh hoặc dán văn bản.');
      if (controller.signal.aborted) return;
      const image = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
      pickingImage.current = false;
      if (controller.signal.aborted || image.canceled || !image.assets[0]) return;
      processingImage.current = true;
      const result = await recognizeImageText(image.assets[0].uri, controller.signal);
      if (controller.signal.aborted) return;
      requests.current += 1; setLoading(false);
      editDraft(true); inputSource.current = 'OCR'; setText(result.text); setInputCharacters(Array.from(result.text).length);
      Alert.alert('Đã nhận chữ từ ảnh', `${result.truncated ? 'Đã lấy 2.000 ký tự đầu. ' : ''}Hãy kiểm tra/sửa chữ rồi nhấn Tách và tra từ; chưa có từ nào được tự động lưu.`);
    } catch (error) {
      if (!controller.signal.aborted) Alert.alert('Chưa nhập được ảnh', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      ocrRequest.current = null;
      pickingImage.current = false;
      processingImage.current = false;
      if (!controller.signal.aborted) setOcrLoading(false);
    }
  };
  const importTxt = async () => {
    if (ocrRequest.current || textImportRequest.current || busy || saving) return;
    setShowImport(true);
    const controller = new AbortController();
    textImportRequest.current = controller; setTextImportLoading(true); pickingText.current = true;
    try {
      const result = await pickReaderDocument(controller.signal, () => { pickingText.current = false; });
      if (!result || controller.signal.aborted) return;
      editDraft(true); setText(result.text); setInputCharacters(Array.from(result.text).length);
      const chunks = splitReaderChunks(result.text); draftChunks.current = chunks;
      setChunkCount(chunks.length); setCharacterCount(Array.from(result.text).length);
      if (chunks[0]) await loadChunk(chunks[0]);
      if (!controller.signal.aborted) Alert.alert(`Đã mở ${result.source}`, 'Toàn bộ văn bản đã được chia phần; chỉ phần hiện tại được tra từ. Bấm Lưu bài đọc để giữ nội dung và vị trí trên thiết bị.');
    } catch (error) {
      if (!controller.signal.aborted) Alert.alert('Chưa mở được TXT/EPUB', error instanceof Error ? error.message : 'Vui lòng thử lại.');
    } finally {
      pickingText.current = false;
      if (textImportRequest.current === controller) textImportRequest.current = null;
      if (!controller.signal.aborted) setTextImportLoading(false);
    }
  };
  const removeDocument = async (document: ReadingDocument) => {
    const confirmed = await ask({ title: 'Xóa bài đọc?', message: 'Bài sẽ được ẩn khỏi thư viện đọc, không ảnh hưởng từ đã học.', acceptLabel: 'Xóa bài đọc', cancelLabel: 'Giữ lại', acceptVariant: 'danger' });
    if (!confirmed) return;
    void deleteReadingDocument(db, document.id).then(async () => {
      if (documentId === document.id) editDraft(true, false);
      setDocuments(await listReadingDocuments(db));
    }).catch(() => Alert.alert('Chưa xóa được bài đọc', 'Vui lòng thử lại.'));
  };

  return <Screen scroll={false} hideTitle title={story?.title ?? (chunk ? documentTitle || 'Đang đọc' : showImport ? 'Thêm bài đọc' : 'Đọc')} subtitle={chunk ? 'Chạm từ để tra nhanh, phần đã mở vẫn hoạt động ngoại tuyến.' : 'Đọc theo nhịp của bạn · nội dung và vị trí được lưu trên thiết bị.'}>
    {dialog}
    <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled"
      scrollEventThrottle={100} onScroll={(event) => { scrollPosition.current = event.nativeEvent.contentOffset.y; }}>
    {!storyId && !story && !chunk && !showImport ? <View style={styles.readerHome}>
      <View style={[styles.readerHero, { backgroundColor: readingMode.surface, borderColor: theme.border }]}>
        <View style={styles.readerCover}><LearningLandscape mood="reading" scene="read" height={150} /><View style={styles.readerGlyph}><Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.readerGlyphText, { color: readingMode.accent }]}>阅</Text></View><Text style={styles.readerCoverTag}>ĐỌC · NHẬN DIỆN · GHI NHỚ</Text></View>
        <View style={styles.readerHeroBody}><Text style={styles.readerEyebrow}>GÓC ĐỌC TIẾNG TRUNG</Text>
        {documents[0] ? <>
          <Text style={styles.readerHeroTitle}>Đọc tiếp</Text>
          <Text numberOfLines={2} style={styles.readerDocumentTitle}>{documents[0].title}</Text>
          <Text style={styles.readerMeta}>Lần mở gần nhất · {new Date(documents[0].updated_at).toLocaleDateString('vi-VN')}</Text>
          <PrimaryButton label="Tiếp tục đọc" onPress={() => void openDocument(documents[0]!)} disabled={busy} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Xóa bài đọc ${documents[0].title}`} disabled={busy || saving} onPress={() => removeDocument(documents[0]!)} style={styles.deleteAction}>
            <Text style={styles.deleteText}>Xóa khỏi thư viện</Text>
          </Pressable>
        </> : <>
          <Text style={styles.readerHeroTitle}>Một đoạn ngắn cũng là tiến bộ.</Text>
          <Text style={styles.readerMeta}>Mở truyện hoặc văn bản của bạn; tra từ theo từng phần để đọc thoải mái.</Text>
        </>}
        </View>
      </View>

      <View style={[styles.card, styles.readerSection]}>
        <Text style={styles.readerSectionKicker}>01 · ĐỌC CÓ HƯỚNG DẪN</Text><Text style={styles.title}>Đọc theo chủ đề</Text>
        <Text style={styles.counter}>Câu chuyện ngắn có cấp độ và câu hỏi đọc hiểu.</Text>
        <PrimaryButton variant="secondary" label="Khám phá truyện" onPress={() => router.push('/stories' as Href)} />
      </View>

      <View style={[styles.card, styles.readerSection]}>
        <Disclosure title="Thêm nội dung của bạn">
        <Text style={styles.counter}>Tài liệu được xử lý trên thiết bị; chỉ phần hiện tại được tra từ.</Text>
        <PrimaryButton label="Mở tệp TXT / EPUB" loading={textImportLoading} disabled={busy || saving} onPress={() => void importTxt()} />
        <PrimaryButton variant="secondary" label="Nhận chữ từ ảnh (OCR)" loading={ocrLoading} disabled={!isImageOcrAvailable() || busy || saving} onPress={() => void importImage()} />
        <PrimaryButton variant="secondary" label="Chụp ảnh để nhận chữ" disabled={!isImageOcrAvailable() || busy || saving} onPress={() => void importImage(true)} />
        <PrimaryButton variant="ghost" label="Dán văn bản" disabled={busy || saving} onPress={() => { setShowImport(true); setText(''); setInputCharacters(0); setInputError(''); }} />
        {!isImageOcrAvailable() ? <Text style={styles.readerMeta}>OCR cần bản Android hỗ trợ; bạn vẫn có thể dán văn bản.</Text> : null}
        </Disclosure>
      </View>

      {documents.length > 1 ? <View style={[styles.card, styles.readerSection]}>
        <Text style={styles.readerSectionKicker}>03 · ĐÃ LƯU TRÊN THIẾT BỊ</Text><Text style={styles.title}>Đọc gần đây</Text>
        {documents.slice(1).map((document) => <View key={document.id} style={styles.savedRow}>
          <Pressable accessibilityRole="button" disabled={busy || saving} style={styles.savedTitle} onPress={() => void openDocument(document)}>
            <Text style={styles.readerDocumentTitle}>{document.title}</Text>
            <Text style={styles.readerMeta}>{new Date(document.updated_at).toLocaleDateString('vi-VN')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xóa bài đọc ${document.title}`} disabled={busy || saving} onPress={() => removeDocument(document)} style={styles.deleteAction}>
            <Text style={styles.deleteText}>Xóa</Text>
          </Pressable>
        </View>)}
      </View> : null}
    </View> : null}

    {showImport && !chunk && !story ? <View style={[styles.card, styles.form]}>
      <PrimaryButton variant="ghost" label="Quay lại thư viện đọc" disabled={busy || saving} onPress={() => setShowImport(false)} />
      {!story && <PrimaryButton variant="secondary" label="Nhập tệp TXT / EPUB" disabled={busy || saving} loading={textImportLoading} onPress={() => void importTxt()} />}
      {textImportLoading ? <PrimaryButton variant="ghost" label="Hủy nhập TXT / EPUB" onPress={() => {
        textImportRequest.current?.abort(); textImportRequest.current = null; setTextImportLoading(false);
      }} /> : null}
      {!story && <PrimaryButton variant="secondary" label={isImageOcrAvailable() ? 'Nhận chữ từ ảnh' : 'Nhận chữ từ ảnh hiện chưa khả dụng · bạn có thể dán văn bản bên dưới'} disabled={!isImageOcrAvailable() || busy || saving} loading={ocrLoading} onPress={() => void importImage()} />}
      {!chunk && !story ? <>
        <TextInput accessibilityLabel="Văn bản bài đọc" value={text} editable={!busy} onChangeText={(value) => {
          const count = Array.from(value).length;
          if (count > MAX_READER_CHARACTERS) { setInputError('Văn bản vượt 100.000 ký tự. Nội dung trước đó được giữ nguyên; hãy chia thành các phần.'); return; }
          setInputError(''); setText(value); setInputCharacters(count);
        }} placeholder="Ví dụ: 我正在学习中文。" placeholderTextColor={theme.textMuted} selectionColor={theme.primary} multiline textAlignVertical="top" autoCorrect={false} style={styles.input} />
        <Text style={styles.counter}>{inputCharacters.toLocaleString('vi-VN')}/100.000 ký tự</Text>
        {inputError ? <Text accessibilityRole="alert" style={styles.error}>{inputError}</Text> : null}
        <PrimaryButton label="Tách và tra từ" loading={loading} disabled={!text.trim() || busy} onPress={() => void analyze()} />
      </> : null}
      {!story && chunk ? <View style={styles.navigation}>
        <PrimaryButton style={styles.navButton} variant="ghost" label={documentId ? 'Dán bài mới' : 'Sửa văn bản'} disabled={busy || saving} onPress={() => editDraft(!!documentId)} />
      </View> : null}
      <Text style={styles.counter}>TXT UTF-8 / UTF-16 có BOM; EPUB chữ XHTML không DRM (8 MiB) · tối đa 100.000 ký tự. Không tải ảnh/CSS/script. PDF và URL chưa hỗ trợ.</Text>
      {chunk && !documentId ? <PrimaryButton variant="secondary" label="Lưu bài đọc" disabled={loading || ocrLoading || textImportLoading || saving} loading={documentSaving}
        onPress={() => void saveDocument()} /> : null}
      {documentSaving ? <PrimaryButton variant="ghost" label="Hủy lưu bài đọc" onPress={() => documentSaveRequest.current?.abort()} /> : null}
    </View> : null}
    {loading ? <View style={styles.card}><Text accessibilityLiveRegion="polite" style={styles.prompt}>Đang mở và tra từ phần hiện tại…</Text>
      <PrimaryButton variant="ghost" label="Hủy mở / tra từ" onPress={() => {
        requests.current++; pageRequest.current?.abort(); setLoading(false); setLoadError('Đã hủy mở / tra từ. Bạn có thể thử lại phần hiện tại hoặc mở lại bài từ lịch sử.');
      }} /></View> : null}
    {loadError ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text>
      {chunk ? <PrimaryButton label="Thử tra lại phần hiện tại" disabled={busy} onPress={() => void loadChunk(chunk, characterPosition.current)} /> : null}
    </View> : null}
    {chunk ? <View style={[styles.card, styles.tokens, styles.readingPaper, { backgroundColor: readingMode.surface }]}>
      <Text style={styles.title}>Phần {chunk.chunk_index + 1}/{chunkCount} · {characterCount.toLocaleString('vi-VN')} ký tự</Text>
      <View style={styles.navigation}>
        <PrimaryButton style={styles.navButton} variant="secondary" label="Phần trước" disabled={busy || saving || chunk.chunk_index === 0} onPress={() => void navigateChunk(chunk.chunk_index - 1)} />
        <PrimaryButton style={styles.navButton} variant="secondary" label="Phần sau" disabled={busy || saving || chunk.chunk_index + 1 >= chunkCount} onPress={() => void navigateChunk(chunk.chunk_index + 1)} />
      </View>
      <Text selectable style={styles.readingText}>{readingSegments.map((segment, index) => segment.token ? <Text key={`${segment.token.charStart}-${index}`}
        accessibilityRole="button" accessibilityLabel={`Tra từ ${segment.text}${segment.token.vocabulary ? `, ${segment.token.vocabulary.primaryMeaningVi}` : ''}`}
        onPress={() => { setSelected(segment.token!); setSavePersonalContext(false); persistPosition(documentId, chunk.char_start + segment.token!.charStart); }}
        style={[styles.inlineToken, segment.token.vocabulary?.status === 'KNOWN' ? styles.inlineKnown : segment.token.vocabulary?.status === 'LEARNING' ? styles.inlineLearning : styles.inlineUnknown]}>{segment.text}</Text> : segment.text)}</Text>
      <ChineseAIEntry label="Chọn đoạn để hỏi AI" context={{ label: 'Đoạn đọc tự chọn (xem trước trước khi gửi)', task: 'reader', context: { kind: 'reader', text: chunk.content.slice(0, 1200) } }} />
    </View> : null}
    {tokens.length ? <View style={[styles.card, styles.tokens]}>
      <Text style={styles.title}>Độ phủ phần hiện tại {metrics.coveragePercent}% · {metrics.difficulty}</Text>
      <Text style={styles.counter}>{metrics.totalWords} từ · {metrics.knownWords} đã biết · {metrics.learningWords} đang học · {metrics.unknownWords} chưa học · HSK ước tính {metrics.estimatedHsk}</Text>
      <Text style={styles.counter}>Chạm trực tiếp vào từ trong bài để xem pinyin, nghĩa và thao tác lưu. Màu xanh: đã biết · vàng: đang học.</Text>
    </View> : null}
    {chunk && !loading && !loadError && tokens.length === 0 ? <EmptyState variant="reading" title="Phần này chưa có từ Hán để tra" message="Văn bản vẫn hiển thị phía trên. Bạn có thể đọc tiếp bằng Phần sau." /> : null}
    {story && question ? <View style={[styles.card, styles.tokens]}>
      <Text style={styles.title}>Kiểm tra đọc hiểu</Text><Text style={styles.prompt}>{question.prompt_vi}</Text>
      {(JSON.parse(question.choices_json) as string[]).map((choice, index) => <Pressable key={choice}
        accessibilityRole="button" disabled={storyAnswer !== null || saving} style={[styles.deckChoice,
          storyAnswer !== null && index === question.correct_index && styles.answerCorrect,
          storyAnswer === index && index !== question.correct_index && styles.answerIncorrect]}
        onPress={() => {
          setSaving(true);
          void recordStoryAnswer(db, story.id, index === question.correct_index).then(() => setStoryAnswer(index))
            .catch(() => Alert.alert('Chưa lưu được', 'Vui lòng thử lại.')).finally(() => setSaving(false));
        }}><Text style={[styles.deckText, storyAnswer !== null && index === question.correct_index && styles.answerCorrectText,
          storyAnswer === index && index !== question.correct_index && styles.answerIncorrectText]}>{choice}</Text></Pressable>)}
      {storyAnswer !== null ? <Text style={storyAnswer === question.correct_index ? styles.answerCorrectText : styles.answerIncorrectText}>{storyAnswer === question.correct_index ? 'Chính xác!' :
        `Đáp án: ${(JSON.parse(question.choices_json) as string[])[question.correct_index]}`}</Text> : null}
    </View> : null}
    </ScrollView>
    <Modal visible={Boolean(selected)} transparent statusBarTranslucent animationType={modalAnimation} onRequestClose={() => setSelected(null)}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng tra từ" onPress={() => setSelected(null)} style={styles.modalScrim} />
        {selected ? <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.hanzi}>{selected.vocabulary?.simplified ?? selected.text}</Text>
              {selected.vocabulary ? <PinyinText value={selected.vocabulary.pinyin} style={styles.pinyin} /> : <Text style={styles.meta}>Chưa có trong kho từ hiện tại</Text>}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Đóng tra từ" onPress={() => setSelected(null)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          {selected.vocabulary ? <>
            <Text style={styles.meaning}>{selected.vocabulary.primaryMeaningVi}</Text>
            <WordAIEntry word={selected.vocabulary} sentence={Array.from(chunk?.content ?? '').slice(Math.max(0, selected.charStart - 80), selected.charEnd + 120).join('')} beforeOpen={() => setSelected(null)} />
            <Text style={styles.meta}>HSK {selected.vocabulary.hskBand} · {selected.vocabulary.status === 'LEARNING' ? 'Đang học' : selected.vocabulary.status === 'KNOWN' ? 'Đã biết' : selected.vocabulary.status === 'SKIPPED' ? 'Đã bỏ qua' : 'Mới'}</Text>
            <PrimaryButton variant="ghost" label="Nhớ lại từ này trong ngữ cảnh" disabled={saving || busy} onPress={() => {
              const vocabularyId=selected.vocabulary?.id;setSelected(null);
                if(vocabularyId)router.push({pathname:'/memory/session',params:{id:vocabularyId,mode:'context',assisted:'1'}} as Href);
            }} />
            <PrimaryButton variant="ghost" label="Mở chi tiết từ" disabled={saving || busy} onPress={() => {
              persistPosition(documentId, (chunk?.char_start ?? 0) + selected.charStart);
              const vocabularyId = selected.vocabulary?.id;
              setSelected(null);
              if (vocabularyId) router.push(`/word/${vocabularyId}` as Href);
            }} />
            {decks.length ? <>
              <Text style={styles.deckLabel}>THÊM VÀO BỘ TỪ</Text>
              <View style={styles.deckChoices}>{decks.map((deck) => <Pressable key={deck.id} onPress={() => setDeckId(deck.id)} style={[styles.deckChoice, deckId === deck.id && styles.deckChoiceActive]}><Text style={[styles.deckText, deckId === deck.id && styles.deckTextActive]}>{deck.name}</Text></Pressable>)}</View>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: savePersonalContext }} onPress={() => setSavePersonalContext(value => !value)} style={{ minHeight: 48, justifyContent: 'center' }}>
                <Text style={styles.counter}>{savePersonalContext ? '☑' : '□'}  Lưu cả câu ngữ cảnh riêng trên thiết bị</Text>
                <Text style={styles.counter}>Chỉ lưu khi bạn chọn; câu không được gửi cho AI hay đồng bộ lên đám mây.</Text>
              </Pressable>
              <PrimaryButton label="Thêm vào bộ từ" loading={saving} onPress={() => void saveToDeck()} />
            </> : <PrimaryButton variant="secondary" label="Tạo bộ từ để lưu" onPress={() => { setSelected(null); router.push('/decks' as Href); }} />}
          </> : <Text style={styles.meta}>Từ này được nhận diện trong bài nhưng chưa có mục từ điển để hiển thị nghĩa.</Text>}
          </ScrollView>
        </View> : null}
      </View>
    </Modal>
  </Screen>;
}

function createStyles(theme: ThemeTokens) { return StyleSheet.create({
  card: { ...baseCard, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, shadowColor: theme.shadow },
  // Reading content follows the semantic surface, with no forced light-paper color in dark mode.
  storySurface: { backgroundColor: theme.surface },
  scroll: { flex: 1 }, scrollContent: { gap: spacing.lg, paddingBottom: spacing.lg },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, navButton: { flexGrow: 1, flexBasis: 140 },
  error: { color: theme.error, lineHeight: 22 }, readingText: { color: theme.textPrimary, fontSize: typography.chineseBody, lineHeight: 32 },
  form: { gap: spacing.sm }, input: { minHeight: 150, maxHeight: 240, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, backgroundColor: theme.surfaceElevated, color: theme.textPrimary, fontSize: 17, lineHeight: 26, padding: spacing.md }, counter: { color: theme.textMuted, fontSize: 11, textAlign: "right" },
  readerHome: { gap: spacing.md }, readerHero: { ...baseCard, padding: 0, alignItems: 'stretch', backgroundColor: theme.readingBackground, borderWidth: 1, borderColor: theme.border, gap: 0, overflow: 'hidden' },
  readerCover: { position: 'relative' }, readerCoverTag: { position: 'absolute', right: spacing.md, bottom: spacing.md, paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: '#FFFFFFE8', color: '#433B32', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  readerHeroBody: { padding: spacing.lg, alignItems: 'flex-start', gap: spacing.sm },
  readerGlyph: { position: 'absolute', left: spacing.md, top: spacing.md, width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  readerGlyphText: { fontSize: 31, fontWeight: '900' }, readerEyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  readerHeroTitle: { color: theme.textPrimary, fontSize: typography.titleLarge, lineHeight: 34, fontWeight: '900' },
  readerDocumentTitle: { color: theme.textPrimary, fontSize: typography.subtitle, lineHeight: 25, fontWeight: '800' },
  readerMeta: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 }, readerSection: { gap: spacing.sm }, readerSectionKicker: { color: theme.primaryText, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, readingPaper: { backgroundColor: theme.readingBackground, shadowOpacity: 0.04, elevation: 1 },
  deleteAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  tokens: { gap: spacing.sm }, title: { color: theme.textPrimary, fontSize: 17, fontWeight: "900" }, prompt: { color: theme.textPrimary, lineHeight: 22 }, inlineToken: { fontWeight: '800', textDecorationLine: 'underline' }, inlineKnown: { color: theme.success }, inlineLearning: { color: theme.warning }, inlineUnknown: { color: theme.primaryText },
  detail: { gap: spacing.sm }, hanzi: { color: theme.textPrimary, fontSize: 44, fontWeight: "900" }, pinyin: { color: theme.textPrimary, fontSize: 20 }, meaning: { color: theme.textPrimary, fontSize: 20, fontWeight: "800" }, meta: { color: theme.textMuted, fontSize: 12 }, deckLabel: { color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: spacing.sm }, deckChoices: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }, deckChoice: { minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.surface }, deckChoiceActive: { backgroundColor: theme.primary, borderColor: theme.primary }, deckText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" }, deckTextActive: { color: theme.onPrimary },
  modalRoot: { flex: 1, justifyContent: 'flex-end' }, modalScrim: { ...StyleSheet.absoluteFill, backgroundColor: theme.overlay }, detailSheet: { maxHeight: '86%', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }, detailScroll: { flexShrink: 1, minHeight: 0 }, detailContent: { gap: spacing.sm, paddingBottom: spacing.xs }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: spacing.xs }, detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, closeButton: { minWidth: 44, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary }, closeText: { color: theme.textSecondary, fontSize: 30, lineHeight: 34 },
  answerCorrect: { borderColor: theme.success, backgroundColor: theme.successSoft }, answerIncorrect: { borderColor: theme.error, backgroundColor: theme.errorSoft }, answerCorrectText: { color: theme.success, fontWeight: '800' }, answerIncorrectText: { color: theme.error, fontWeight: '800' },
  savedRow: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderColor: theme.border, paddingTop: spacing.sm },
  savedTitle: { flex: 1 }, deleteText: { color: theme.error, fontWeight: '700' },
}); }
