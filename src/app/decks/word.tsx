import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BilingualMeaningList } from "@/components/BilingualMeaningList";
import { HanziHandwritingPad } from "@/components/HanziHandwritingPad";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { card, colors, radius, spacing } from "@/constants/design";
import {
  findHanziCandidates,
  findMeaningCandidates,
  getVocabulary,
  saveCustomVocabulary,
  updateVocabularyContent,
} from "@/db/repository";
import { pickAndPersistWordImage } from "@/services/media/word-image";
import { primaryEnglishMeaning } from "@/services/vocabulary/bilingual-meanings";
import type { EditableVocabulary, HskBand, Vocabulary } from "@/types/models";

type ExampleDraft = { chinese: string; pinyin: string; vietnamese: string };
const emptyExample = (): ExampleDraft => ({
  chinese: "",
  pinyin: "",
  vietnamese: "",
});
const bands: HskBand[] = [1, 2, 3, 4, 5, 6, "7-9"];
export default function WordEditor() {
  const { deckId = "", id } = useLocalSearchParams<{
    deckId?: string;
    id?: string;
  }>();
  const db = useSQLiteContext();
  const [original, setOriginal] = useState<Vocabulary | null>(null);
  const [hanzi, setHanzi] = useState("");
  const [traditional, setTraditional] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [meanings, setMeanings] = useState("");
  const [englishMeanings, setEnglishMeanings] = useState("");
  const [pos, setPos] = useState("");
  const [band, setBand] = useState<HskBand>(1);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [examples, setExamples] = useState<ExampleDraft[]>([emptyExample()]);
  const [candidates, setCandidates] = useState<Vocabulary[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [meaningQuery, setMeaningQuery] = useState("");
  const [meaningCandidates, setMeaningCandidates] = useState<Vocabulary[]>([]);
  const [meaningLoading, setMeaningLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [handwritingCount, setHandwritingCount] = useState(1);
  useEffect(() => {
    if (!id) return;
    getVocabulary(db, id).then((word) => {
      if (!word) return;
      setOriginal(word);
      setHanzi(word.simplified);
      setTraditional(word.traditional);
      setPinyin(word.pinyin);
      setMeanings(word.meaningsVi.join("\n"));
      setEnglishMeanings(word.meaningsEn.join("\n"));
      setPos(word.pos.join(", "));
      setBand(word.hskBand);
      setImageUri(word.imageUri);
      setExamples(
        word.examples.length
          ? word.examples.slice(0, 1).map((e) => ({
              chinese: e.chinese,
              pinyin: e.pinyin,
              vietnamese: e.vietnamese,
            }))
          : [emptyExample()],
      );
    });
  }, [db, id]);
  useEffect(() => {
    let cancelled = false;
    if (original || !hanzi.trim()) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(() => {
      if (!cancelled) setCandidatesLoading(true);
      findHanziCandidates(db, hanzi)
        .then((items) => {
          if (!cancelled) setCandidates(items);
        })
        .finally(() => {
          if (!cancelled) setCandidatesLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, hanzi, original]);
  useEffect(() => {
    let cancelled = false;
    if (original || !meaningQuery.trim()) {
      return () => {
        cancelled = true;
      };
    }

    const timer = setTimeout(() => {
      if (cancelled) return;
      setMeaningLoading(true);
      void findMeaningCandidates(db, meaningQuery)
        .then((items) => {
          if (!cancelled) setMeaningCandidates(items);
        })
        .catch(() => {
          if (!cancelled) setMeaningCandidates([]);
        })
        .finally(() => {
          if (!cancelled) setMeaningLoading(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, meaningQuery, original]);
  const updateMeaningQuery = (value: string) => {
    setMeaningQuery(value);
    setMeaningCandidates([]);
    setMeaningLoading(false);
  };
  const selectRecognizedHanzi = (value: string) => {
    setHanzi(value);
    setTraditional("");
    setPinyin("");
    setMeanings("");
    setEnglishMeanings("");
    setPos("");
    setBand(1);
    setImageUri(null);
    setExamples([emptyExample()]);
    setCandidates([]);
    setCandidatesLoading(true);
    setSelectedCandidateId(null);
    setMeaningQuery("");
    setMeaningCandidates([]);
    setMeaningLoading(false);
  };
  const applyCandidate = (word: Vocabulary) => {
    setSelectedCandidateId(word.id);
    setHanzi(word.simplified);
    setTraditional(word.traditional);
    setPinyin(word.pinyin);
    setMeanings(word.meaningsVi.join("\n"));
    setEnglishMeanings(word.meaningsEn.join("\n"));
    setPos(word.pos.join(", "));
    setBand(word.hskBand);
    setImageUri(word.imageUri);
    setMeaningQuery("");
    setMeaningCandidates([]);
    setMeaningLoading(false);
    setExamples(
      word.examples[0]
        ? [
        {
          chinese: word.examples[0].chinese,
          pinyin: word.examples[0].pinyin,
          vietnamese: word.examples[0].vietnamese,
        },
          ]
        : [emptyExample()],
    );
  };
  const save = async () => {
    const meaningsVi = meanings
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const meaningsEn = englishMeanings
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!hanzi.trim() || !pinyin.trim() || !meaningsVi.length || !meaningsEn.length) {
      Alert.alert(
        "Thiếu thông tin",
        "Hanzi, Pinyin, nghĩa tiếng Việt và nghĩa tiếng Anh tương ứng là bắt buộc.",
      );
      return;
    }
    setSaving(true);
    try {
      if (original && !original.isCustom) {
        await updateVocabularyContent(db, original.id, {
          pinyin,
          meaningsVi,
          meaningsEn,
          pos: pos
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          imageUri,
        });
        router.back();
        return;
      }
      const input: EditableVocabulary = {
        id: original?.id,
        deckId: original?.deckId ?? deckId,
        simplified: hanzi.trim(),
        traditional: traditional.trim() || hanzi.trim(),
        pinyin: pinyin.trim(),
        meaningsVi,
        meaningsEn,
        pos: pos
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        hskBand: band,
        imageUri,
        examples: examples.filter((e) => e.chinese.trim()),
      };
      const savedId = await saveCustomVocabulary(db, input);
      router.replace(`/word/${savedId}`);
    } finally {
      setSaving(false);
    }
  };
  const updateExample = (
    index: number,
    key: keyof ExampleDraft,
    value: string,
  ) =>
    setExamples((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  return (
    <Screen
      title={original ? "Chỉnh sửa từ" : "Thêm từ vào bộ"}
      subtitle="Dữ liệu bạn sửa được lưu riêng trên thiết bị và dùng ngay trong các phiên ôn."
    >
      {!original ? (
        <>
          <View style={[card, styles.section, styles.lookupCard]}>
            <Text style={styles.title}>Không nhớ chữ Hán?</Text>
            <Text style={styles.lookupHint}>
              Nhập nghĩa tiếng Việt để tìm từ trong kho. Chọn một kết quả để
              tự điền chữ Hán, phồn thể, pinyin, nghĩa Việt–Anh tương ứng, HSK và ví dụ; bạn vẫn có thể
              chỉnh lại nghĩa trước khi lưu.
            </Text>
            <Field
              label="TÌM TỪ THEO NGHĨA"
              value={meaningQuery}
              onChangeText={updateMeaningQuery}
              placeholder="Ví dụ: giáo viên, cảm ơn, rất"
            />
            {meaningQuery.trim() ? (
              <View>
                <Text style={styles.smallLabel}>CHỌN TỪ MUỐN HỌC</Text>
                {meaningLoading ? (
                  <Text style={styles.helperText}>
                    Đang tìm trong kho từ…
                  </Text>
                ) : meaningCandidates.length ? (
                  <View style={styles.suggestions}>
                    {meaningCandidates.map((item) => (
                      <Pressable
                        key={`meaning-${item.id}`}
                        style={[
                          styles.suggestion,
                          selectedCandidateId === item.id &&
                            styles.suggestionActive,
                        ]}
                        onPress={() => applyCandidate(item)}
                      >
                        <Text style={styles.suggestionHanzi}>
                          {item.simplified}
                        </Text>
                        <View style={styles.suggestionBody}>
                          <Text style={styles.suggestionPinyin}>
                            {item.pinyin}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={styles.suggestionMeaning}
                          >
                            {item.primaryMeaningVi}
                          </Text>
                          <Text numberOfLines={1} style={styles.suggestionEnglish}>
                            {primaryEnglishMeaning(item.meaningsEn)}
                          </Text>
                          <Text style={styles.suggestionMeta}>
                            HSK {item.hskBand}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.warningText}>
                    Chưa thấy từ phù hợp. Thử một nghĩa ngắn hơn hoặc viết chữ
                    Hán ở bên dưới.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
          <View style={[card, styles.section]}>
            <Text style={styles.title}>1. Viết chữ Hán</Text>
            <Text style={styles.helperText}>
              Bạn cũng có thể viết tay để app nhận diện và gợi ý pinyin.
            </Text>
            <Text style={styles.smallLabel}>SỐ CHỮ MUỐN VIẾT</Text>
            <View style={styles.bands}>
              {[1, 2, 3, 4].map((count) => (
                <Pressable
                  key={count}
                  onPress={() => setHandwritingCount(count)}
                  style={[styles.band, handwritingCount === count && styles.bandActive]}
                >
                  <Text style={[styles.bandText, handwritingCount === count && styles.bandTextActive]}>
                    {count} chữ
                  </Text>
                </Pressable>
              ))}
            </View>
            <HanziHandwritingPad key={handwritingCount} characterCount={handwritingCount} onSelect={selectRecognizedHanzi} />
          </View>
        </>
      ) : null}
      <View style={[card, styles.section]}>
        <Text style={styles.title}>
          {original ? "Nội dung từ vựng" : "2. Chọn nội dung"}
        </Text>
        {original ? (
          <>
            <Field
              label="CHỮ HÁN *"
              value={hanzi}
              onChangeText={setHanzi}
              placeholder="例如: 学习"
            />
            <Field
              label="PHỒN THỂ"
              value={traditional}
              onChangeText={setTraditional}
              placeholder="學習"
            />
            <Field
              label="PINYIN *"
              value={pinyin}
              onChangeText={setPinyin}
              placeholder="xué xí"
            />
          </>
        ) : (
          <View style={styles.recognizedCard}>
            <Text style={styles.smallLabel}>CHỮ ĐÃ NHẬN DIỆN</Text>
            <Text style={styles.recognizedHanzi}>{hanzi || "—"}</Text>
            {pinyin ? (
              <>
                <Text style={styles.selectedPinyin}>{pinyin}</Text>
                <Text style={styles.selectedTraditional}>
                  Phồn thể: {traditional || hanzi}
                </Text>
              </>
            ) : (
              <Text style={styles.helperText}>
                Viết, nhấn nhận diện và chọn chữ đúng ở phía trên.
              </Text>
            )}
          </View>
        )}
        {!original && hanzi ? (
          <View>
            <Text style={styles.smallLabel}>
              CHỌN TỪ VÀ PINYIN ĐÚNG
            </Text>
            {candidatesLoading ? (
              <Text style={styles.helperText}>Đang tìm cách đọc phù hợp…</Text>
            ) : candidates.length ? (
              <View style={styles.suggestions}>
                {candidates.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.suggestion,
                      selectedCandidateId === item.id &&
                        styles.suggestionActive,
                    ]}
                    onPress={() => applyCandidate(item)}
                  >
                    <Text style={styles.suggestionHanzi}>
                      {item.simplified}
                    </Text>
                    <View style={styles.suggestionBody}>
                      <Text style={styles.suggestionPinyin}>{item.pinyin}</Text>
                      <Text numberOfLines={1} style={styles.suggestionMeaning}>
                        {item.primaryMeaningVi}
                      </Text>
                      <Text numberOfLines={1} style={styles.suggestionEnglish}>
                        {primaryEnglishMeaning(item.meaningsEn)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.warningText}>
                Chưa tìm thấy chữ này trong kho từ. Hãy viết lại hoặc chọn dự
                đoán khác.
              </Text>
            )}
          </View>
        ) : null}
        <View style={styles.meaningColumns}>
          <View style={styles.meaningColumn}>
            <Field
              label="NGHĨA TIẾNG VIỆT *"
              value={meanings}
              onChangeText={setMeanings}
              placeholder={"học tập\nhọc"}
              multiline
            />
          </View>
          <View style={styles.meaningColumn}>
            <Field
              label="ENGLISH MEANING *"
              value={englishMeanings}
              onChangeText={setEnglishMeanings}
              placeholder={"to study\nto learn"}
              multiline
            />
          </View>
        </View>
        {meanings.trim() || englishMeanings.trim() ? (
          <BilingualMeaningList
            compact
            meaningsVi={meanings.split("\n")}
            meaningsEn={englishMeanings.split("\n")}
          />
        ) : null}
        <Field
          label="TỪ LOẠI (phân cách bằng dấu phẩy)"
          value={pos}
          onChangeText={setPos}
          placeholder="động từ, danh từ"
        />
        <Text style={styles.smallLabel}>CẤP ĐỘ</Text>
        <View style={styles.bands}>
          {bands.map((item) => (
            <Pressable
              key={String(item)}
              style={[styles.band, band === item && styles.bandActive]}
              onPress={() => setBand(item)}
            >
              <Text
                style={[
                  styles.bandText,
                  band === item && styles.bandTextActive,
                ]}
              >
                HSK {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[card, styles.section]}>
        <Text style={styles.title}>Hình ảnh minh họa</Text>
        {imageUri ? (
          <Image source={imageUri} style={styles.image} contentFit="cover" />
        ) : null}
        <PrimaryButton
          variant="secondary"
          label={imageUri ? "Đổi ảnh" : "Chọn ảnh từ điện thoại"}
          onPress={() =>
            void pickAndPersistWordImage().then(
              (uri) => uri && setImageUri(uri),
            )
          }
        />
        {imageUri ? (
          <PrimaryButton
            variant="ghost"
            label="Bỏ ảnh"
            onPress={() => setImageUri(null)}
          />
        ) : null}
      </View>
      <View style={[card, styles.section]}>
        <Text style={styles.title}>Ví dụ sử dụng</Text>
        <Text style={styles.helperText}>
          App dùng đúng một ví dụ theo ngữ cảnh. Khi kho từ chưa có ví dụ, hệ
          thống sẽ tự tạo một ngữ cảnh học an toàn để bạn có thể chỉnh lại.
        </Text>
        {examples.map((example, index) => (
          <View key={index} style={styles.example}>
            <Text style={styles.exampleTitle}>Ví dụ {index + 1}</Text>
            <Field
              label="CÂU TIẾNG TRUNG"
              value={example.chinese}
              onChangeText={(v) => updateExample(index, "chinese", v)}
              placeholder="我每天学习汉语。"
            />
            <Field
              label="PINYIN"
              value={example.pinyin}
              onChangeText={(v) => updateExample(index, "pinyin", v)}
              placeholder="Wǒ měitiān xuéxí Hànyǔ."
            />
            <Field
              label="NGHĨA"
              value={example.vietnamese}
              onChangeText={(v) => updateExample(index, "vietnamese", v)}
              placeholder="Tôi học tiếng Trung mỗi ngày."
            />
          </View>
        ))}
      </View>
      <PrimaryButton
        label="Lưu từ vựng"
        loading={saving}
        onPress={() => void save()}
      />
    </Screen>
  );
}
function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.smallLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, props.multiline && styles.multiline]}
        textAlignVertical={props.multiline ? "top" : "center"}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { fontSize: 18, fontWeight: "900", color: colors.text },
  field: { gap: 6 },
  smallLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  multiline: { minHeight: 100, paddingTop: spacing.md },
  recognizedCard: {
    alignItems: "center",
    gap: 4,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  recognizedHanzi: { fontSize: 40, fontWeight: "900", color: colors.text },
  selectedPinyin: { fontSize: 17, fontWeight: "800", color: colors.primary },
  selectedTraditional: { fontSize: 12, color: colors.textMuted },
  helperText: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
  warningText: { fontSize: 12, color: colors.primary, marginTop: spacing.sm },
  suggestions: { gap: spacing.sm, marginTop: spacing.sm },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  suggestionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  suggestionHanzi: { fontSize: 22, fontWeight: "800", color: colors.text },
  suggestionBody: { flex: 1, gap: 2 },
  suggestionPinyin: { fontSize: 13, fontWeight: "700", color: colors.primary },
  suggestionMeaning: { fontSize: 12, color: colors.textMuted },
  suggestionEnglish: { fontSize: 11, color: colors.textMuted, fontStyle: "italic" },
  suggestionMeta: { fontSize: 11, color: colors.textMuted },
  lookupCard: { borderColor: colors.primarySoft, borderWidth: 1 },
  lookupHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted },
  meaningColumns: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  meaningColumn: { flex: 1, minWidth: 0 },
  bands: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  band: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bandActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bandText: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
  bandTextActive: { color: "#fff" },
  image: { height: 190, width: "100%", borderRadius: radius.md },
  example: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  exampleTitle: { fontSize: 13, fontWeight: "900", color: colors.primary },
});
