import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useIsFocused, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Easing, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { HskBadge, MasteryBadge } from "@/components/Badges";
import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { WordAIEntry } from "@/components/ChineseAIEntry";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { ExampleSentence as Example } from '@/components/ExampleSentence';
import { LexicalKnowledgeCard } from '@/components/LexicalKnowledgeCard';
import { PersonalContextCard } from '@/components/PersonalContextCard';
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StrokeWriter } from "@/components/StrokeWriter";
import { AnswerFeedbackIcon } from "@/components/ui/AnswerFeedbackIcon";
import { FlashcardFlip } from "@/components/ui/FlashcardFlip";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { designColors, radius, spacing, themedCard } from "@/constants/design";
import { getHsk30WordLevels } from "@/db/hsk30";
import { recordLessonActivityEvidence } from "@/db/learning-path";
import {
  copyVocabularyBatchToDeck,
  getNotes,
  getRelatedVocabulary,
  getVocabulary,
  listPersonalDecks,
  saveNotes,
  toggleFavorite,
} from "@/db/repository";
import { useModalAnimationType, useReducedMotion } from '@/hooks/use-reduced-motion';
import { primaryEnglishMeaning } from "@/services/vocabulary/bilingual-meanings";
import { analyzeVocabulary, buildMnemonicNote } from "@/services/vocabulary/character-analysis";
import { useAppStore } from "@/stores/app-store";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { PersonalDeck, Vocabulary } from "@/types/models";

type Tab = "overview" | "writing" | "examples" | "notes";
export default function WordDetail() {
  const { id, lessonActivityId, hskSourceId } = useLocalSearchParams<{ id: string; lessonActivityId?: string; hskSourceId?: string }>();
  const focused = useIsFocused();
  const db = useSQLiteContext();
  const theme = useTheme();
  const colors = designColors(theme);
  const card = themedCard(theme);
  const styles = useThemeStyles(createStyles);
  const modalAnimation = useModalAnimationType();
  const [word, setWord] = useState<Vocabulary | null>();
  const [hsk30Levels, setHsk30Levels] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [character, setCharacter] = useState("");
  const [notes, setNotes] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [saveMessage, setSaveMessage] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [related, setRelated] = useState<Vocabulary[]>([]);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deckPickerOpen, setDeckPickerOpen] = useState(false);
  const [deckPickerLoading, setDeckPickerLoading] = useState(false);
  const [addingToDeckId, setAddingToDeckId] = useState<string | null>(null);
  const [deckPickerMessage, setDeckPickerMessage] = useState("");
  const setLearnQueue = useAppStore((state) => state.setLearnQueue);
  useEffect(() => {
    let live = true;
    // Clear the previous word before an asynchronous ID-scoped load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWord(undefined); setLoadFailed(false); setRelated([]); setSaveMessage("");
    if (!id) { setWord(null); return; }
    void Promise.all([getVocabulary(db, id), getNotes(db, id), getHsk30WordLevels(db, id, hskSourceId)]).then(
      ([value, note, levels]) => {
        if (!live) return;
        setWord(value);
        setHsk30Levels(levels);
        setCharacter(value?.simplified[0] ?? "");
        setNotes(note);
        if (value) {
          void getRelatedVocabulary(db, value).then(rows => { if (live) setRelated(rows); }).catch(() => { if (live) setRelated([]); });
          if (lessonActivityId) void recordLessonActivityEvidence(db, lessonActivityId, "VOCABULARY_DETAIL_VIEWED", value.id).catch(() => undefined);
        }
      },
    ).catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [db, id, lessonActivityId, hskSourceId, reload]);
  if (loadFailed) return <Screen><Text style={styles.loading}>Chưa tải được từ vựng. Dữ liệu của bạn vẫn được giữ nguyên.</Text><PrimaryButton label="Thử tải lại" onPress={() => setReload(value => value + 1)} /></Screen>;
  if (word === undefined)
    return (
      <Screen>
        <Text style={styles.loading}>Đang tải từ vựng…</Text>
      </Screen>
    );
  if (!word)
    return (
      <Screen>
        <EmptyState
          title="Không tìm thấy từ"
          message="Từ này có thể chưa có trong dữ liệu offline."
        />
      </Screen>
    );
  const learn = async () => {
    if (word.status === "LEARNING") {
      router.push("/review");
      return;
    }
    if (word.status === "KNOWN" || word.status === "SKIPPED") return;
    // Never mark a word learned from the detail screen. Route through the
    // normal NEW-word encoding screen so the answer is shown and the learner
    // must copy it once before Level 1 is persisted.
    setLearnQueue([word]);
    router.push(
      word.deckId
        ? ({ pathname: "/learn/session", params: { deckId: word.deckId } } as Href)
        : "/learn/session",
    );
  };
  const addToDeck = () => { void openDeckPicker(); };
  async function openDeckPicker() {
    setDeckPickerOpen(true);
    setDeckPickerLoading(true);
    setDeckPickerMessage("");
    try {
      setDecks(await listPersonalDecks(db));
    } catch {
      setDeckPickerMessage("Không tải được danh sách bộ từ. Hãy thử lại.");
    } finally {
      setDeckPickerLoading(false);
    }
  }
  const addSelectedWordToDeck = async (deck: PersonalDeck) => {
    if (addingToDeckId || word.deckId === deck.id) return;
    setAddingToDeckId(deck.id);
    setDeckPickerMessage("");
    try {
      const outcome = await copyVocabularyBatchToDeck(db, deck.id, [word]);
      setDeckPickerMessage(outcome.saved
        ? "\u0110\u00e3 th\u00eam " + word.simplified + " v\u00e0o \u201c" + deck.name + "\u201d."
        : "T\u1eeb n\u00e0y \u0111\u00e3 c\u00f3 trong \u201c" + deck.name + "\u201d.");
    } catch {
      setDeckPickerMessage("Ch\u01b0a th\u1ec3 th\u00eam t\u1eeb. H\u00e3y th\u1eed l\u1ea1i.");
    } finally {
      setAddingToDeckId(null);
    }
  };

  const favorite = async () => {
    const next = await toggleFavorite(db, word.id);
    setWord({ ...word, isFavorite: next });
  };
  const analyses = analyzeVocabulary(word);
  const generatedMnemonic = buildMnemonicNote(analyses);
  const insertMnemonic = () => {
    if (notes.includes(generatedMnemonic)) return;
    setNotes(notes.trim() ? `${notes.trim()}\n\n${generatedMnemonic}` : generatedMnemonic);
  };
  return (
    <>
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.wordBlock}>
            <Text style={styles.hanzi}>{word.simplified}</Text>
            <PinyinText value={word.pinyin} style={styles.pinyin} />
            <Text style={styles.traditional}>Phồn thể: {word.traditional}</Text>
          </View>
          <View style={styles.heroActions}>
            {!word.deckId ? <Pressable accessibilityLabel="Thêm vào bộ từ" accessibilityRole="button" onPress={() => void addToDeck()} style={styles.round}><Ionicons name="add" size={25} color={theme.primaryText} /></Pressable> : null}
            <AudioButton text={word.simplified} size={25} />
            <Pressable
              accessibilityLabel="Chỉnh sửa nghĩa"
              onPress={() =>
                router.push({
                  pathname: "/decks/word",
                  params: { id: word.id, deckId: word.deckId ?? "" },
                } as unknown as Href)
              }
              style={styles.round}
            >
              <Ionicons name="pencil" size={21} color={theme.primaryText} />
            </Pressable>
            <Pressable onPress={() => void favorite()} style={styles.round}>
              <Ionicons
                name={word.isFavorite ? "bookmark" : "bookmark-outline"}
                size={24}
                color={word.isFavorite ? colors.accent : theme.primaryText}
              />
            </Pressable>
          </View>
        </View>
        <View style={styles.heroMeanings}>
          <Text style={styles.meaning}>{word.primaryMeaningVi}</Text>
          <Text style={[styles.meaning, styles.meaningEn]}>{primaryEnglishMeaning(word.meaningsEn)}</Text>
        </View>
        <View style={styles.badges}>
          {hsk30Levels.length ? <Text style={styles.pos}>HSK 3.0 · 11/2025: {hsk30Levels.map(level => 'HSK ' + level).join(', ')} · Cấp trong bộ từ gốc:</Text> : null}
          <HskBadge band={word.hskBand} />
          <MasteryBadge level={word.masteryLevel} status={word.status} />
          {word.pos.map((item) => (
            <Text key={item} style={styles.pos}>
              {item}
            </Text>
          ))}
        </View>
      </View>
      <WordAIEntry key={word.id} word={word} />
      <WordTabs tab={tab} onChange={setTab} active={focused} />
      <StudyTransition turnKey={tab} effect="reveal" testID="word-tab-content" style={{ gap: spacing.md }}>
      {tab === "overview" ? (
        <>
          {word.imageUri ? (
            <Image
              source={word.imageUri}
              style={styles.wordImage}
              contentFit="cover"
            />
          ) : (
            <RecallCard key={word.id} word={word} />
          )}
          <View style={card}>
            <Text style={styles.section}>Nghĩa Việt–Anh tương ứng</Text>
            <BilingualMeaningList
              meaningsVi={word.meaningsVi}
              meaningsEn={word.meaningsEn}
              primaryMeaningVi={word.primaryMeaningVi}
            />
            <Text style={styles.source}>
              Nghĩa và cách dùng có thể thay đổi theo ngữ cảnh; hãy xem ví dụ trước khi ghi nhớ.
            </Text>
          </View>
          <LexicalKnowledgeCard vocabularyId={word.id} />
          {word.examples[0] ? <Example key={word.examples[0].id} item={word.examples[0]} /> : null}
          {related.length ? <View style={[card, styles.related]}>
            <Text style={styles.section}>Từ liên quan</Text>
            <Text style={styles.relatedHint}>Cùng Hán tự, ưu tiên cấp HSK phù hợp và từ bạn đang học.</Text>
            <View style={styles.relatedList}>{related.map((item) => <Pressable key={item.id} onPress={() => router.push(`/word/${item.id}` as Href)} style={styles.relatedItem}>
              <Text style={styles.relatedHanzi}>{item.simplified}</Text><View style={styles.relatedCopy}><PinyinText value={item.pinyin} /><Text numberOfLines={1} style={styles.relatedMeaning}>{item.primaryMeaningVi}</Text></View>
            </Pressable>)}</View>
          </View> : null}
          <PrimaryButton
            label={word.status === "LEARNING" ? "Mở ôn tập" : word.status === "KNOWN" ? "Đã biết" : "Học từ này"}
            onPress={() => void learn()}
          />
        </>
      ) : null}
      {tab === "writing" ? (
        <View style={[card, styles.writing]}>
          <View style={styles.characters}>
            {analyses.map(({ character: char }) => (
              <Pressable
                key={char}
                onPress={() => setCharacter(char)}
                style={[
                  styles.character,
                  character === char && styles.characterActive,
                ]}
              >
                <Text
                  style={[
                    styles.characterText,
                    character === char && styles.characterTextActive,
                  ]}
                >
                  {char}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.meta}>
            Bộ tra chữ {character}: {analyses.find(item => item.character === character)?.radical ?? "chưa xác minh"} · {word.strokeCount ?? "—"} nét (tổng mục từ)
          </Text>
          <StrokeWriter character={character} />
          <PrimaryButton
            label="Luyện viết bằng tay"
            onPress={() => router.push(`/writing/${character}`)}
          />
          <PrimaryButton variant="secondary" label="Nhớ chữ rồi viết (che mẫu)" onPress={() => router.push({pathname:'/memory/session',params:{id:word.id,mode:'writing',assisted:'1'}} as Href)} />
          <PrimaryButton variant="ghost" label="Cấu tạo chữ và mẹo nhớ cá nhân" onPress={() => router.push({pathname:'/memory/structure',params:{id:word.id,character}} as Href)} />
        </View>
      ) : null}
      {tab === "examples" ? (
        <View style={styles.exampleList}>
          <PersonalContextCard key={word.id} vocabularyId={word.id} answers={[word.simplified,word.traditional]} reveal editable />
          {word.examples.length ? (
            word.examples.map((item) => <Example key={item.id} item={item} />)
          ) : (
            <EmptyState
              variant="vocabulary"
              title="Chưa có ví dụ"
              message="Chưa có câu song ngữ phù hợp đã kiểm tra cho từ này."
            />
          )}
        </View>
      ) : null}
      {tab === "notes" ? (
        <>
          <View style={[card, styles.analysisCard]}>
            <View style={styles.analysisHeader}>
              <View style={styles.analysisCopy}>
                <Text style={styles.section}>Phân tích bộ thủ & mẹo nhớ</Text>
                <Text style={styles.analysisHint}>Liên tưởng gợi ý để bạn tự chỉnh sửa, không phải giải thích nguồn gốc lịch sử.</Text>
              </View>
              <Text style={styles.analysisIcon}>忆</Text>
            </View>
            {analyses.map((analysis) => (
              <View key={analysis.character} style={styles.analysisRow}>
                <View style={styles.analysisCharacter}>
                  <Text style={styles.analysisHanzi}>{analysis.character}</Text>
                  <Text style={styles.analysisRadical}>{analysis.radical ?? "·"}</Text>
                </View>
                <View style={styles.analysisBody}>
                  <Text style={styles.analysisLabel}>Bộ tra từ điển</Text>
                  <Text style={styles.analysisText}>{analysis.radicalName} · {analysis.radicalMeaning}</Text>
                  <Text style={styles.analysisLabel}>Phân rã</Text>
                  <Text style={styles.analysisText}>{analysis.decomposition}</Text>
                  <Text style={styles.analysisLabel}>Liên tưởng cá nhân</Text>
                  <Text style={styles.mnemonic}>{analysis.mnemonic}</Text>
                </View>
              </View>
            ))}
            <PrimaryButton variant="secondary" label="Chèn mẹo nhớ vào ghi chú" onPress={insertMnemonic} />
            <PrimaryButton variant="ghost" label="Xem cấu tạo có nguồn và viết mẹo của tôi" onPress={() => router.push({pathname:'/memory/structure',params:{id:word.id}} as Href)} />
          </View>
          <View style={card}>
          <Text style={styles.section}>Ghi chú cá nhân</Text>
          <TextInput
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Mẹo nhớ, ngữ cảnh sử dụng..."
            placeholderTextColor={colors.textMuted}
            style={styles.notes}
          />
          <PrimaryButton
            label="Lưu ghi chú"
            disabled={savingNotes}
            onPress={() => {
              setSavingNotes(true); setSaveMessage("");
              void saveNotes(db, word.id, notes).then(() => setSaveMessage("Đã lưu ghi chú."))
                .catch(() => setSaveMessage("Chưa lưu được. Ghi chú đang nhập vẫn còn; hãy thử lại."))
                .finally(() => setSavingNotes(false));
            }}
          />
          {saveMessage ? <StudyTransition active={focused} turnKey={saveMessage} effect="reveal" durationMs={180} animateOnMount testID="word-save-feedback" accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AnswerFeedbackIcon correct={saveMessage === 'Đã lưu ghi chú.'} active={false} turnKey={saveMessage} size={24} />
            <Text style={{ flex: 1, color: theme.textSecondary }}>{saveMessage}</Text>
          </StudyTransition> : null}
          </View>
        </>
      ) : null}
      </StudyTransition>
    </Screen>
      <Modal visible={deckPickerOpen} transparent animationType={modalAnimation} onRequestClose={() => setDeckPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.deckPicker}>
            <Text style={styles.deckPickerTitle}>{"Th\u00eam v\u00e0o b\u1ed9 t\u1eeb"}</Text>
            <Text style={styles.deckPickerHint}>{"Ch\u1ecdn b\u1ea5t k\u1ef3 b\u1ed9 t\u1eeb ri\u00eang n\u00e0o \u0111\u1ec3 sao ch\u00e9p t\u1eeb n\u00e0y."}</Text>
            {deckPickerLoading ? <View style={styles.deckPickerLoading}><ActivityIndicator color={colors.primary} /><Text style={styles.deckPickerStatus}>{"\u0110ang t\u1ea3i b\u1ed9 t\u1eeb..."}</Text></View> : null}
            {!deckPickerLoading && decks.length ? <ScrollView style={styles.deckList} contentContainerStyle={styles.deckListContent} showsVerticalScrollIndicator>
              {decks.map((deck) => {
                const isCurrentDeck = word.deckId === deck.id;
                const isAdding = addingToDeckId === deck.id;
                return <Pressable
                  key={deck.id}
                  accessibilityRole="button"
                  accessibilityLabel={deck.name + ", " + (isCurrentDeck ? "\u0111ang \u1edf b\u1ed9 n\u00e0y" : deck.wordCount + " t\u1eeb")}
                  disabled={isCurrentDeck || Boolean(addingToDeckId)}
                  onPress={() => void addSelectedWordToDeck(deck)}
                  style={[styles.deckRow, isCurrentDeck && styles.deckRowDisabled]}
                >
                  <View style={[styles.deckColor, { backgroundColor: deck.color }]} />
                  <View style={styles.deckCopy}>
                    <Text numberOfLines={1} style={styles.deckName}>{deck.name}</Text>
                    <Text style={styles.deckMeta}>{isCurrentDeck ? "\u0110ang \u1edf b\u1ed9 n\u00e0y" : deck.wordCount + " t\u1eeb"}</Text>
                  </View>
                  {isAdding ? <ActivityIndicator color={colors.primary} /> : <Ionicons name={isCurrentDeck ? "checkmark-circle" : "add-circle-outline"} size={24} color={isCurrentDeck ? colors.textMuted : colors.primary} />}
                </Pressable>;
              })}
            </ScrollView> : null}
            {!deckPickerLoading && !decks.length ? <View style={styles.deckPickerEmpty}>
              <Text style={styles.deckPickerStatus}>{"Ch\u01b0a c\u00f3 b\u1ed9 t\u1eeb ri\u00eang n\u00e0o."}</Text>
              <PrimaryButton label={"T\u1ea1o b\u1ed9 t\u1eeb"} onPress={() => { setDeckPickerOpen(false); router.push("/decks"); }} />
            </View> : null}
            {deckPickerMessage ? <Text accessibilityLiveRegion="polite" style={styles.deckPickerMessage}>{deckPickerMessage}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="\u0110\u00f3ng" onPress={() => setDeckPickerOpen(false)} style={styles.deckPickerClose}>
              <Text style={styles.deckPickerCloseText}>{"\u0110\u00f3ng"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
function RecallCard({ word }: { word: Vocabulary }) {
  const theme = useTheme();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [drag] = useState(() => new Animated.Value(0));
  const [cardWidth, setCardWidth] = useState(320);
  const dragging = useRef(false);
  const ignorePress = useRef(false);
  useEffect(() => {
    const reset = () => { dragging.current = false; drag.stopAnimation(); drag.setValue(0); };
    reset();
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') reset(); });
    return () => { subscription.remove(); reset(); };
  }, [drag, focused, reduced, word.id, cardWidth]);
  const pan = useMemo(() => {
    const resetDrag = () => {
      dragging.current = false;
      if (reduced || !focused || (AppState.currentState && AppState.currentState !== 'active')) { drag.stopAnimation(); drag.setValue(0); }
      else Animated.spring(drag, { toValue: 0, stiffness: 240, damping: 24, mass: 0.7, useNativeDriver: true, isInteraction: false }).start();
    };
    // PanResponder.create stores these callbacks; refs are read only when gesture events occur.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      // ponytail: horizontal drag only on the detail card; keep vertical scrolling and review grading untouched.
      onMoveShouldSetPanResponder: (_, gesture) => focused && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
      onPanResponderGrant: () => { dragging.current = true; ignorePress.current = true; drag.stopAnimation(); },
      onPanResponderMove: (_, gesture) => { if (dragging.current && !reduced) drag.setValue(Math.max(-64, Math.min(64, gesture.dx * 0.45))); },
      onPanResponderRelease: (_, gesture) => {
        if (dragging.current && focused && (AppState.currentState == null || AppState.currentState === 'active') && Math.abs(gesture.dx) >= Math.min(80, cardWidth * 0.25)) setRevealed(value => !value);
        resetDrag();
      },
      onPanResponderTerminate: resetDrag,
      onPanResponderTerminationRequest: () => true,
    });
  }, [cardWidth, drag, focused, reduced]);
  return <StudyTransition active={focused} turnKey={word.id} effect="reveal" animateOnMount testID="word-recall-card" style={{ gap: 10 }}>
    <Animated.View {...pan.panHandlers} testID="word-recall-drag" onLayout={({ nativeEvent: { layout } }) => setCardWidth(layout.width)}
      style={{ transform: [{ translateX: drag }, { rotate: drag.interpolate({ inputRange: [-64, 64], outputRange: ['-5deg', '5deg'], extrapolate: 'clamp' }) }] }}>
    <MotionPressable accessibilityLabel={revealed ? 'Lật thẻ xem chữ Hán' : 'Lật thẻ xem nghĩa'} accessibilityState={{ expanded: revealed }}
      onPressIn={() => { ignorePress.current = false; }} onPress={() => { if (!ignorePress.current) setRevealed(value => !value); }} pressedScale={0.98}
      style={{ backgroundColor: theme.skillSurfaces.reading, borderRadius: 24, borderWidth: 1, borderColor: theme.border, padding: 20 }}>
      <FlashcardFlip active={focused} revealed={revealed} turnKey={word.id} testID="word-recall-flip">{back => <View testID={back ? 'word-recall-back' : 'word-recall-front'} style={{ minHeight: 156, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Text style={{ color: theme.skillColors.reading, fontSize: 11, letterSpacing: 1, fontWeight: '800' }}>{back ? 'NGHĨA & NGỮ CẢNH' : 'THẺ GHI NHỚ'}</Text>
        <Text style={{ color: theme.textPrimary, fontSize: back ? 25 : 48, lineHeight: back ? 34 : 60, fontWeight: '800', textAlign: 'center' }}>{back ? word.primaryMeaningVi : word.simplified}</Text>
        {back && word.examples[0] ? <Text style={{ color: theme.textSecondary, fontSize: 17, lineHeight: 25, textAlign: 'center' }}>{word.examples[0].chinese}</Text> : <PinyinText value={word.pinyin} />}
      </View>}</FlashcardFlip>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 }}>
        <Ionicons name="swap-horizontal" size={18} color={theme.primaryText} />
        <Text style={{ color: theme.primaryText, fontWeight: '700', flexShrink: 1 }}>{revealed ? 'Chạm hoặc vuốt để xem chữ' : 'Chạm hoặc vuốt để xem nghĩa'}</Text>
      </View>
    </MotionPressable>
    </Animated.View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ flex: 1, color: theme.textSecondary, fontSize: 13 }}>Tự nhớ, rồi lật thẻ. Giữ loa để nghe chậm.</Text>
      <AudioButton text={word.simplified} allowWhenSoundDisabled />
    </View>
  </StudyTransition>;
}

function WordTabs({ tab, onChange, active }: { tab: Tab; onChange: (tab: Tab) => void; active: boolean }) {
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const reduced = useReducedMotion();
  const tabs = [['overview', 'Tổng quan'], ['writing', 'Cách viết'], ['examples', 'Ví dụ'], ['notes', 'Ghi chú']] as const;
  const index = tabs.findIndex(([key]) => key === tab);
  const previous = useRef(index);
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(index));
  const [stretch] = useState(() => new Animated.Value(1));
  useLayoutEffect(() => {
    const changed = previous.current !== index;
    previous.current = index;
    const settle = () => { position.stopAnimation(); stretch.stopAnimation(); position.setValue(index); stretch.setValue(1); };
    position.stopAnimation(); stretch.stopAnimation();
    if (changed && active && !reduced && width > 0 && (AppState.currentState == null || AppState.currentState === 'active')) {
      stretch.setValue(0);
      Animated.parallel([
        Animated.timing(position, { toValue: index, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: true, isInteraction: false }),
        Animated.timing(stretch, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false }),
      ]).start();
    } else settle();
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') settle(); });
    return () => { subscription.remove(); position.stopAnimation(); stretch.stopAnimation(); };
  }, [active, index, position, reduced, stretch, width]);
  const cell = Math.max(0, (width - 8) / tabs.length);
  return <View style={styles.tabs} onLayout={({ nativeEvent: { layout } }) => setWidth(layout.width)}>
    {cell > 0 ? <Animated.View testID="word-tab-indicator" pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 4, top: 4, bottom: 4, width: cell, borderRadius: 12, backgroundColor: theme.primarySoft, borderWidth: 1, borderColor: theme.primary,
        transform: [{ translateX: Animated.multiply(position, cell) }, { scaleX: stretch.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 1.12, 1] }) }] }} /> : null}
    {tabs.map(([key, label]) => <MotionPressable key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: tab === key }}
      onPress={() => onChange(key)} style={styles.tab}>
      <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
    </MotionPressable>)}
  </View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { const colors = designColors(theme); return StyleSheet.create({
  loading: { marginTop: 60, textAlign: "center", color: colors.textMuted },
  hero: { marginTop: spacing.lg, gap: spacing.md },
  heroTop: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, justifyContent: "space-between" },
  wordBlock: { flexGrow: 1, flexBasis: 144, gap: 3 },
  hanzi: { color: colors.text, fontSize: 52, fontWeight: "800" },
  pinyin: { fontSize: 21 },
  traditional: { color: colors.textMuted, fontSize: 12 },
  heroActions: { flexDirection: "row", gap: spacing.xs },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  meaning: { flex: 1, color: colors.text, fontSize: 20, fontWeight: "700" },
  heroMeanings: { flexDirection: "row", gap: spacing.md },
  meaningEn: { flex: 1, color: colors.textMuted },
  badges: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  pos: { color: colors.textMuted, fontSize: 12 },
  tabs: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 16,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    paddingVertical: 8,
  },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", textAlign: 'center' },
  tabTextActive: { color: colors.primaryText },
  wordImage: { height: 210, width: "100%", borderRadius: radius.lg },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.md,
  },
  bullet: { color: colors.text, fontSize: 15, lineHeight: 24 },
  source: { color: colors.textMuted, fontSize: 10, marginTop: spacing.md },
  writing: { alignItems: "center", gap: spacing.md },
  characters: { flexDirection: "row", gap: spacing.sm },
  character: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  characterActive: { backgroundColor: colors.primary },
  characterText: { color: colors.text, fontSize: 27, fontWeight: "700" },
  characterTextActive: { color: "#fff" },
  meta: { color: colors.textMuted, fontSize: 12 },
  exampleList: { gap: spacing.md },
  related: { gap: spacing.sm },
  relatedHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: -spacing.sm },
  relatedList: { gap: spacing.xs },
  relatedItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  relatedHanzi: { minWidth: 48, color: colors.primaryText, fontSize: 25, fontWeight: "900" },
  relatedCopy: { flex: 1, gap: 2 },
  relatedMeaning: { color: colors.textMuted, fontSize: 12 },
  analysisCard: { gap: spacing.md, backgroundColor: colors.primarySoft },
  analysisHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  analysisCopy: { flex: 1 },
  analysisHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  analysisIcon: { color: colors.primaryText, fontSize: 34, fontWeight: "900" },
  analysisRow: { flexDirection: "row", gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  analysisCharacter: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, justifyContent: "center", minHeight: 78, width: 72 },
  analysisHanzi: { color: colors.text, fontSize: 37, fontWeight: "900" },
  analysisRadical: { color: colors.primaryText, fontSize: 12, fontWeight: "900", marginTop: 2 },
  analysisBody: { flex: 1, gap: 2 },
  analysisLabel: { color: colors.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.5, marginTop: 3 },
  analysisText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  mnemonic: { color: colors.text, fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  notes: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.overlay, padding: spacing.lg },
  deckPicker: { width: "100%", maxWidth: 460, maxHeight: "82%", backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  deckPickerTitle: { color: colors.text, fontSize: 22, fontWeight: "800" },
  deckPickerHint: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  deckPickerLoading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  deckList: { maxHeight: 360, marginTop: spacing.xs },
  deckListContent: { gap: spacing.xs, paddingVertical: spacing.xs },
  deckRow: { alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deckRowDisabled: { backgroundColor: colors.background, opacity: 0.72 },
  deckColor: { width: 12, height: 36, borderRadius: 6 },
  deckCopy: { flex: 1, gap: 2 },
  deckName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  deckMeta: { color: colors.textMuted, fontSize: 12 },
  deckPickerEmpty: { gap: spacing.md, paddingVertical: spacing.md },
  deckPickerStatus: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  deckPickerMessage: { color: colors.primaryText, fontSize: 13, fontWeight: "700", lineHeight: 19, marginTop: spacing.xs },
  deckPickerClose: { alignItems: "center", minHeight: 44, justifyContent: "center", marginTop: spacing.xs },
  deckPickerCloseText: { color: colors.primaryText, fontSize: 16, fontWeight: "800" },
}); }
