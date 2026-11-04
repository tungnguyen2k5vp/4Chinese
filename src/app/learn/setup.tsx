import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { AudioButton } from '@/components/AudioButton';
import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { EmptyState } from '@/components/EmptyState';
import { PinyinText } from '@/components/PinyinText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { designColors, radius, spacing, themedCard } from '@/constants/design';
import {
  getHskLearningGroups, getLearningWordBatch, getNewWordsLearnedToday, getSettings, getUnlearnedCatalog,
  listPersonalDecks, setKnown, setSkipped, type LearningCatalogWord,
} from '@/db/repository';
import { useNewWordAudio } from '@/hooks/use-new-word-audio';
import { HSK30_COUNTS, HSK30_LEVELS } from '@/services/hsk/hsk30-source';
import { getLearnSessionLimit } from '@/services/learning/session-limit';
import { groupLearningTopics, vocabularyTopics, type VocabularyTopicId } from '@/services/learning/vocabulary-topics';
import { useAppStore } from '@/stores/app-store';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';
import type { PersonalDeck, UserSettings, Vocabulary } from '@/types/models';

const sessionSizes = [5, 10, 15, 20] as const;

export default function LearnSetup() {
  const { deckId } = useLocalSearchParams<{ deckId?: string }>();
  const db = useSQLiteContext();
  const theme = useTheme();
  const colors = designColors(theme);
  const card = themedCard(theme);
  const styles = useThemeStyles(createStyles);
  const setQueue = useAppStore(state => state.setLearnQueue);
  const [source, setSource] = useState<'topics' | 'decks' | 'hsk'>('topics');
  const [selectedTopic, setSelectedTopic] = useState<VocabularyTopicId | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [selectedHsk, setSelectedHsk] = useState<string | null>(null);
  const activeDeckId = deckId || selectedDeck || undefined;
  const [catalog, setCatalog] = useState<LearningCatalogWord[] | null>(null);
  const [topicGroups, setTopicGroups] = useState<Map<VocabularyTopicId, LearningCatalogWord[]> | null>(null);
  const catalogRequest = useRef<Promise<LearningCatalogWord[]> | null>(null);
  const [hskGroups, setHskGroups] = useState<Map<string, string[]> | null>(null);
  const [decks, setDecks] = useState<PersonalDeck[] | null>(null);
  const [candidates, setCandidates] = useState<string[] | null>(null);
  const [available, setAvailable] = useState<Vocabulary[]>([]);
  const [selected, setSelected] = useState<Vocabulary[]>([]);
  const [index, setIndex] = useState(0);
  const [goal, setGoal] = useState(10);
  const [remainingToday, setRemainingToday] = useState(0);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceError, setSourceError] = useState(false);
  const [wordLoading, setWordLoading] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [loadedCandidates, setLoadedCandidates] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [visit, setVisit] = useState(0);
  const [retry, setRetry] = useState(0);
  const nextOffset = useRef(0);
  const pageGeneration = useRef(0);
  const actionLock = useRef(false);
  const sessionStarted = useRef(false);
  // Source counts never require examples or full word records. Decks bypass the shared catalog.
  const currentGoal = Math.min(goal, remainingToday, candidates?.length ?? 0);
  const word = available[index];

  useFocusEffect(useCallback(() => {
    catalogRequest.current = null;
    setCatalog(null);
    setTopicGroups(null);
    setHskGroups(null);
    setDecks(null);
    setCandidates(null);
    setSelectedDeck(null);
    setSelectedHsk(null);
    setSelectedTopic(null);
    setSelected([]);
    setSettings(null);
    setSettingsError(false);
    setSourceLoading(true);
    setSourceError(false);
    setPageError(false);
    sessionStarted.current = false;
    setVisit(value => value + 1);
  }, []));

  useEffect(() => {
    if (!visit) return;
    let live = true;
    void Promise.all([getSettings(db), getNewWordsLearnedToday(db)]).then(([value, learnedToday]) => {
      if (!live) return;
      setSettings(value);
      setSettingsError(false);
      setRemainingToday(getLearnSessionLimit({ dailyGoal: value.dailyNewWordGoal, learnedToday, sessionLimit: 20, available: 20 }).remainingToday);
    }).catch(() => { if (live) setSettingsError(true); });
    return () => { live = false; };
  }, [db, visit, retry]);

  useEffect(() => {
    if (!visit || candidates) return;
    let live = true;
    const load = async () => {
      if (activeDeckId) {
        const words = await getUnlearnedCatalog(db, activeDeckId);
        if (live) setCandidates(words.map(item => item.id));
      } else if (source === 'decks') {
        const value = await listPersonalDecks(db);
        if (live) setDecks(value);
      } else if (source === 'hsk') {
        let groups = await getHskLearningGroups(db);
        if (!groups && live) {
          // ponytail: old databases without the installed syllabus use the existing strict matcher.
          catalogRequest.current ??= getUnlearnedCatalog(db);
          const words = await catalogRequest.current;
          const { hsk30LearningGroups } = await import('@/services/learning/learn-sources');
          groups = new Map(Array.from(hsk30LearningGroups(words), ([level, items]) => [level, items.map(item => item.id)]));
        }
        if (live) setHskGroups(groups);
      } else {
        catalogRequest.current ??= getUnlearnedCatalog(db);
        const words = await catalogRequest.current;
        if (!live) return;
        setCatalog(words);
        const groups = await groupLearningTopics(words, () => live);
        if (live) setTopicGroups(groups);
      }
    };
    void load().catch(() => {
      if (live) { catalogRequest.current = null; setSourceError(true); }
    }).finally(() => { if (live) setSourceLoading(false); });
    return () => { live = false; };
  }, [db, visit, source, activeDeckId, candidates, retry]);

  const loadPage = useCallback((offset: number, generation = pageGeneration.current) => {
    if (!candidates) return;
    return getLearningWordBatch(db, candidates, offset, activeDeckId).then(page => {
      if (generation !== pageGeneration.current) return;
      setAvailable(page.words);
      setLoadedCandidates(candidates);
      setPageError(false);
      if (offset === 0) { setSelected([]); setActionError(false); }
      nextOffset.current = page.nextOffset;
      setIndex(0);
    }).catch(() => { if (generation === pageGeneration.current) setPageError(true); })
      .finally(() => { if (generation === pageGeneration.current) { setWordLoading(false); actionLock.current = false; } });
  }, [db, candidates, activeDeckId]);

  useEffect(() => {
    const generation = ++pageGeneration.current;
    nextOffset.current = 0;
    if (candidates) void loadPage(0, generation);
    return () => { pageGeneration.current = generation + 1; };
  }, [candidates, loadPage]);

  useEffect(() => { actionLock.current = false; }, [word?.id]);
  useNewWordAudio(word && settings && !wordLoading && loadedCandidates === candidates ? `${activeDeckId ?? selectedHsk ?? selectedTopic}:${word.id}` : null,
    word?.simplified, Boolean(settings?.soundEnabled), settings?.speechRate ?? 0.82);

  const begin = (queue: Vocabulary[]) => {
    if (!queue.length || sessionStarted.current) return;
    sessionStarted.current = true;
    actionLock.current = true;
    setQueue(queue);
    router.push(activeDeckId ? { pathname: '/learn/session', params: { deckId: activeDeckId } } as Href : '/learn/session');
  };
  const advance = (queue = selected) => {
    if (queue.length >= currentGoal && currentGoal > 0) { begin(queue); return; }
    if (index + 1 < available.length) { setIndex(value => value + 1); return; }
    if (candidates && nextOffset.current < candidates.length) { setWordLoading(true); void loadPage(nextOffset.current); return; }
    if (queue.length) begin(queue);
    else { setIndex(value => value + 1); actionLock.current = false; }
  };
  const choose = () => {
    if (!word || saving || actionLock.current || selected.some(item => item.id === word.id)) return;
    actionLock.current = true;
    const next = [...selected, word];
    setSelected(next);
    advance(next);
  };
  const mark = async (known: boolean) => {
    if (!word || saving || actionLock.current) return;
    actionLock.current = true;
    setSaving(true);
    setActionError(false);
    try {
      if (known) await setKnown(db, word.id, true);
      else await setSkipped(db, word.id);
      catalogRequest.current = null;
      advance();
    } catch { setActionError(true); actionLock.current = false; }
    finally { setSaving(false); }
  };
  const changeSource = () => {
    setSourceLoading(true);
    setSourceError(false);
    setPageError(false);
    setSelected([]);
    setCandidates(null);
    setSelectedDeck(null);
    setSelectedHsk(null);
    setSelectedTopic(null);
  };
  const chooseSource = (value: typeof source) => {
    if (value === source) return;
    setSourceLoading(true);
    setSourceError(false);
    setSource(value);
  };
  const chooseGroup = (words: LearningCatalogWord[]) => setCandidates(words.map(item => item.id));
  const sessionPicker = <View style={styles.sessionPicker}>
    <Text style={styles.topicTitle}>Số từ mỗi lượt</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Số từ mỗi lượt" style={styles.sessionSizes}>
      {sessionSizes.map(size => <Pressable key={size} accessibilityRole="radio" accessibilityLabel={`${size} từ mỗi lượt`}
        aria-checked={goal === size} aria-disabled={selected.length > 0 || saving}
        accessibilityState={{ checked: goal === size, disabled: selected.length > 0 || saving }}
        disabled={selected.length > 0 || saving} onPress={() => setGoal(size)}
        style={[styles.sessionSize, goal === size && styles.sourceTabActive]}><Text style={[styles.sourceTabText, goal === size && styles.sourceTabTextActive]}>{size} từ</Text></Pressable>)}
    </View>
    <Text style={styles.topicDescription}>{selected.length ? 'Đổi nguồn học để chọn lại số từ.' : 'Mỗi lượt ngắn, học tiếp khi bạn sẵn sàng.'}</Text>
  </View>;
  const retrySource = <PrimaryButton label="Thử tải lại" variant="secondary" onPress={() => { setSettingsError(false); setSourceLoading(true); setSourceError(false); setRetry(value => value + 1); }} />;

  if (!candidates) return <Screen title={activeDeckId ? 'Chọn từ trong bộ' : 'Bạn muốn học từ đâu?'} subtitle="Chọn số từ mỗi lượt, rồi chọn nguồn học.">
    {sessionPicker}
    {!activeDeckId ? <View style={styles.sourceTabs}>{([['topics', 'Chủ đề'], ['decks', 'Bộ từ riêng'], ['hsk', 'HSK 3.0']] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: source === value }} onPress={() => chooseSource(value)} style={[styles.sourceTab, source === value && styles.sourceTabActive]}><Text style={[styles.sourceTabText, source === value && styles.sourceTabTextActive]}>{label}</Text></Pressable>)}</View> : null}
    {settingsError || sourceError ? <><Text accessibilityRole="alert" style={styles.error}>Chưa tải được nguồn học. Hãy thử lại.</Text>{retrySource}</> : null}
    {sourceLoading ? <ActivityIndicator accessibilityLabel="Đang tải nguồn học" color={colors.primary} /> : null}
    {!activeDeckId && source === 'topics' && topicGroups && !sourceLoading ? <>
      <Text style={styles.topicDescription}>{vocabularyTopics.length} chủ đề · {catalog?.length.toLocaleString('vi-VN')} từ chưa học</Text>
      <View style={styles.topicGrid}>{vocabularyTopics.filter(topic => topicGroups.has(topic.id)).map(topic => {
        const words = topicGroups.get(topic.id)!;
        return <Pressable key={topic.id} accessibilityRole="button" accessibilityLabel={`${topic.title}, ${words.length} từ`} disabled={!settings} style={[card, styles.topicCard]} onPress={() => { setSelectedTopic(topic.id); chooseGroup(words); }}>
          <View style={styles.topicCopy}><Text style={styles.topicTitle}>{topic.title}</Text><Text style={styles.topicDescription}>{topic.description}</Text></View><Text style={styles.changeTopicText}>{words.length} từ →</Text>
        </Pressable>;
      })}</View>
      {!catalog?.length ? <EmptyState variant="vocabulary" title="Không còn từ mới" message="Chọn bộ từ riêng hoặc ôn các từ đã học." /> : null}
    </> : null}
    {!activeDeckId && source === 'decks' ? <View style={styles.topicGrid}>{!sourceLoading && decks?.map(deck => <Pressable key={deck.id} accessibilityRole="button" accessibilityLabel={`Học bộ ${deck.name}`} disabled={!settings} style={[card, styles.topicCard]} onPress={() => setSelectedDeck(deck.id)}><View style={styles.topicCopy}><Text style={styles.topicTitle}>{deck.name}</Text><Text style={styles.topicDescription}>{deck.wordCount} từ trong bộ</Text></View><Text style={styles.changeTopicText}>Chọn →</Text></Pressable>)}
      {!sourceLoading && decks?.length === 0 ? <EmptyState title="Chưa có bộ từ riêng" message="Tạo bộ từ và thêm những từ bạn muốn học." /> : null}<PrimaryButton label="Quản lý bộ từ riêng" variant="secondary" onPress={() => router.push('/decks')} />
    </View> : null}
    {!activeDeckId && source === 'hsk' ? <>
      <Text style={styles.topicDescription}>Đề cương 11/2025 · HSK 7–9 dùng chung danh sách.</Text>
      <View style={styles.topicGrid}>{HSK30_LEVELS.map((level, levelIndex) => {
        const words = hskGroups?.get(level);
        return <Pressable key={level} accessibilityRole="button" accessibilityLabel={`Học từ HSK ${level}`} disabled={sourceLoading || !settings || !words} style={[card, styles.topicCard]} onPress={() => { setSelectedHsk(level); setCandidates(words!); }}>
          <View style={styles.topicCopy}><Text style={styles.topicTitle}>HSK {level === '7-9' ? '7–9' : level}</Text><Text style={styles.topicDescription}>{HSK30_COUNTS.vocabulary[levelIndex]!.toLocaleString('vi-VN')} mục trong đề cương{words && !sourceLoading ? ` · ${words.length.toLocaleString('vi-VN')} từ chưa học sẵn sàng` : ''}</Text></View><Text style={styles.changeTopicText}>Chọn →</Text>
        </Pressable>;
      })}</View>
    </> : null}
  </Screen>;

  if (settings && remainingToday === 0) return <Screen title="Mục tiêu hôm nay đã hoàn thành" subtitle="Bạn vẫn có thể ôn các từ đã học."><PrimaryButton label="Ôn tập ngay" onPress={() => router.push('/review')} />{!deckId ? <PrimaryButton label="Đổi nguồn học" variant="secondary" onPress={changeSource} /> : null}</Screen>;
  if (settingsError) return <Screen title="Chưa tải được thiết lập">{retrySource}</Screen>;
  if (pageError) return <Screen title="Chưa tải được từ" subtitle={`Đã chọn ${selected.length} từ. Bạn có thể thử lại để tiếp tục.`}><PrimaryButton label="Tải lại từ" onPress={() => void loadPage(nextOffset.current)} />{!deckId ? <PrimaryButton label="Đổi nguồn học" variant="secondary" onPress={changeSource} /> : null}</Screen>;
  if (wordLoading || loadedCandidates !== candidates || !settings) return <Screen title="Đang chuẩn bị lượt học"><ActivityIndicator accessibilityLabel="Đang tải từ của lượt học" color={colors.primary} /></Screen>;
  if (!word) return <Screen title="Chọn từ để học"><EmptyState variant="vocabulary" title="Không còn từ mới" message="Các từ chưa học trong phạm vi này đã được xử lý." />
    {selected.length ? <PrimaryButton label={`Bắt đầu với ${selected.length} từ`} onPress={() => begin(selected)} /> : null}
    {selectedHsk ? <PrimaryButton label={`Xem đủ danh mục HSK ${selectedHsk}`} variant="secondary" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band: selectedHsk, section: 'vocabulary' } } as Href)} /> : null}
    {!deckId ? <PrimaryButton label="Đổi nguồn học" variant="secondary" onPress={changeSource} /> : null}
  </Screen>;

  const example = word.examples[0];
  const title = activeDeckId ? 'Bộ từ riêng' : selectedHsk ? `HSK ${selectedHsk} · đề cương 3.0` : vocabularyTopics.find(topic => topic.id === selectedTopic)?.title;
  return <Screen title={`Chọn từ để bắt đầu học (${selected.length}/${currentGoal})`} subtitle={`${title} · còn ${remainingToday} từ theo mục tiêu hôm nay`}>
    {!deckId ? <Pressable accessibilityRole="button" disabled={saving} onPress={changeSource} style={styles.changeTopic}><Text style={styles.changeTopicText}>Đổi nguồn học</Text></Pressable> : null}
    {sessionPicker}
    {currentGoal < goal ? <Text style={styles.topicDescription}>Lượt này còn {currentGoal} từ phù hợp với nguồn học và mục tiêu hôm nay.</Text> : null}
    <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, currentGoal ? selected.length / currentGoal * 100 : 0)}%` as DimensionValue }]} /></View>
    <View style={[card, styles.wordCard]}>
      <Text style={styles.hanzi}>{word.simplified}</Text>
      <View style={styles.audioRow}><PinyinText value={word.pinyin} style={styles.pinyin} /><AudioButton text={word.simplified} size={26} /></View>
      <Text style={styles.meaning}>{word.primaryMeaningVi}</Text><Text style={styles.meta}>{word.pos.join(' · ')} · HSK {selectedHsk ?? word.hskBand}</Text>
      {word.imageUri ? <Image source={word.imageUri} style={styles.image} contentFit="cover" /> : null}
      {example ? <View style={styles.example}><Text style={styles.exampleChinese}>{example.chinese}</Text><Text style={styles.exampleVi}>{example.vietnamese}</Text></View> : null}
    </View>
    {actionError ? <Text accessibilityRole="alert" style={styles.error}>Chưa lưu được thao tác. Từ này vẫn ở đây để bạn thử lại.</Text> : null}
    <View style={styles.skipRow}><Pressable accessibilityRole="button" disabled={saving} onPress={() => void mark(false)} style={styles.skipButton}><Text style={styles.skipText}>Bỏ qua</Text></Pressable></View>
    <View style={styles.actionButtons}><PrimaryButton variant="secondary" label="Đã biết" loading={saving} onPress={() => void mark(true)} style={styles.actionButton} /><PrimaryButton label="Học từ này" disabled={saving} onPress={choose} style={styles.actionButton} /></View>
  </Screen>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { const colors = designColors(theme); return StyleSheet.create({
  sourceTabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.md, backgroundColor: colors.border },
  sourceTab: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 6, borderRadius: radius.sm },
  sourceTabActive: { backgroundColor: colors.primarySoft }, sourceTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textAlign: 'center' }, sourceTabTextActive: { color: colors.primaryText },
  sessionPicker: { gap: spacing.sm }, sessionSizes: { flexDirection: 'row', gap: spacing.xs },
  sessionSize: { flex: 1, minHeight: 44, padding: spacing.xs, justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  topicGrid: { gap: spacing.md }, topicCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 94 },
  topicCopy: { flex: 1, gap: spacing.xs }, topicTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  topicDescription: { color: colors.textMuted, fontSize: 13, lineHeight: 18 }, error: { color: theme.error, lineHeight: 20 },
  changeTopic: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  changeTopicText: { color: colors.primaryText, fontWeight: '900' },
  progressTrack: { height: 9, borderRadius: 99, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99, backgroundColor: colors.primary },
  wordCard: { gap: spacing.sm, alignItems: 'flex-start', paddingVertical: spacing.lg },
  hanzi: { color: colors.primaryText, fontSize: 50, fontWeight: '900' }, audioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pinyin: { color: colors.text, fontSize: 22 }, meaning: { color: colors.text, fontSize: 22, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 13 }, image: { width: '100%', height: 160, borderRadius: radius.md },
  example: { marginTop: spacing.xs, gap: spacing.xs }, exampleChinese: { color: colors.text, fontSize: 17, fontWeight: '700' }, exampleVi: { color: colors.textMuted, lineHeight: 20 },
  skipRow: { alignItems: 'flex-end' }, skipButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, skipText: { color: colors.text, fontWeight: '800' },
  actionButtons: { flexDirection: 'row', gap: spacing.sm }, actionButton: { flex: 1, minHeight: 46, paddingHorizontal: spacing.sm },
}); }
