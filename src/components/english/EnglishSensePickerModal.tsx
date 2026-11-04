import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EnglishAudioButton } from "@/components/EnglishAudioButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { SkypediaMeaning } from "@/db/english/skypedia";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

type SenseGroup = { key: string; label: string };
const groupOrder = ["danh từ", "động từ", "cụm động từ", "tính từ", "trạng từ"];

function groupFor(meaning: SkypediaMeaning): SenseGroup {
  const value = `${meaning.rawPos} ${meaning.pos}`.toLocaleLowerCase("vi");
  if (/phrasal|cụm động từ/u.test(value)) return { key: "cụm động từ", label: "Cụm động từ" };
  if (/^(n|noun)\b|danh từ/u.test(value)) return { key: "danh từ", label: "Danh từ" };
  if (/^(v|verb)\b|động từ/u.test(value)) return { key: "động từ", label: "Động từ" };
  if (/^(a|adj|adjective)\b|tính từ/u.test(value)) return { key: "tính từ", label: "Tính từ" };
  if (/^(r|adv|adverb)\b|trạng từ/u.test(value)) return { key: "trạng từ", label: "Trạng từ" };
  return { key: meaning.pos || "khác", label: meaning.pos || "Loại từ khác" };
}

function normalizeVietnameseSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi");
}

export interface EnglishSensePickerModalProps {
  visible: boolean;
  headword: string;
  meanings: SkypediaMeaning[];
  selected: SkypediaMeaning | null;
  initialMeaning?: string;
  allowManualMeaning?: boolean;
  onClose: () => void;
  onConfirm: (selected: SkypediaMeaning | null, meaning: string) => void;
}

/** Compact, evidence-honest sense picker shared by dictionary detail and bulk import. */
export function EnglishSensePickerModal({
  visible,
  headword,
  meanings,
  selected,
  initialMeaning = "",
  allowManualMeaning = false,
  onClose,
  onConfirm,
}: EnglishSensePickerModalProps) {
  const theme = useTheme();
  const palette = getEnglishPalette(theme.mode === "dark");
  const insets = useSafeAreaInsets();
  const modalAnimation = useModalAnimationType();
  const [showInfo, setShowInfo] = useState(false);
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [pending, setPending] = useState<SkypediaMeaning | null>(selected);
  const [meaning, setMeaning] = useState(initialMeaning);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const found = new Map<string, SenseGroup>();
    for (const item of meanings) {
      const group = groupFor(item);
      found.set(group.key, group);
    }
    return [...found.values()].sort((left, right) => {
      const leftIndex = groupOrder.indexOf(left.key);
      const rightIndex = groupOrder.indexOf(right.key);
      return (leftIndex < 0 ? groupOrder.length : leftIndex) -
        (rightIndex < 0 ? groupOrder.length : rightIndex) ||
        left.label.localeCompare(right.label, "vi");
    });
  }, [meanings]);

  const visibleMeanings = useMemo(() => {
    const needle = normalizeVietnameseSearch(query.trim());
    return meanings.filter((item) => {
      if (activeGroup !== "all" && groupFor(item).key !== activeGroup) return false;
      if (!needle) return true;
      const haystack = normalizeVietnameseSearch([
        item.meaning,
        item.pos,
        item.rawPos,
        item.example,
        item.usageNote,
      ].join(" "));
      return haystack.includes(needle);
    });
  }, [activeGroup, meanings, query]);

  const pronunciations = useMemo(() => {
    const seen = new Set<string>();
    return meanings.flatMap((item) => item.pronunciations).filter((item) => {
      const key = `${item.ipa}\u0000${item.region}`;
      if (!item.ipa || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [meanings]);

  const confirm = () => {
    const sourceMeaning = pending?.shortMeaning || pending?.meaning || "";
    const selectedMeaning = allowManualMeaning
      ? meaning.trim()
      : sourceMeaning.trim();
    const retainedSense = pending && [pending.shortMeaning, pending.meaning].some(
      (source) => selectedMeaning === source.trim(),
    ) ? pending : null;
    onConfirm(retainedSense, selectedMeaning);
  };

  const box = { backgroundColor: palette.surface, borderColor: palette.border };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={modalAnimation}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.keyboardFrame, { paddingTop: insets.top }]}
        >
          <View
            testID="english-sense-picker"
            style={[
              styles.sheet,
              box,
              { maxHeight: Math.min(height * 0.92, 820), paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={[styles.headword, { color: palette.textPrimary }]} numberOfLines={1}>
                  {headword}
                </Text>
                <Text style={{ color: palette.textSecondary }}>
                  Chọn nghĩa bạn muốn học · {meanings.length} nghĩa
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng chọn nghĩa"
                onPress={onClose}
                style={styles.iconButton}
              >
                <Ionicons name="close" size={22} color={palette.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.pronunciationRow}>
              {pronunciations.length ? (
                <View testID="english-sense-pronunciation-copy" style={styles.pronunciationCopy}>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>IPA mục từ</Text>
                  {pronunciations.slice(0, 2).map((item, index) => (
                    <Text key={`${item.ipa}-${item.region}-${index}`} style={{ color: palette.textSecondary }} numberOfLines={1}>
                      {item.region ? `${item.region} · ` : "Vùng giọng chưa ghi · "}{item.ipa}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text testID="english-sense-pronunciation-copy" style={[styles.pronunciationCopy, { color: palette.textMuted }]}>Nguồn chưa có IPA cho mục này.</Text>
              )}
              <View testID="english-sense-pronunciation-audio" style={styles.pronunciationAudio}>
                <EnglishAudioButton text={headword} />
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setShowInfo(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: palette.textMuted }}>Thông tin nguồn {showInfo ? '−' : '+'}</Text></Pressable>
            {showInfo ? <Text style={[styles.helper, { color: palette.textMuted }]}>
              Phát âm là TTS trên thiết bị; IPA thuộc mục từ, không gắn riêng cho từng nghĩa.
              Chưa có tần suất nghĩa đã xác minh.
            </Text> : null}

            <TextInput
              testID="english-sense-search"
              accessibilityLabel="Tìm trong nghĩa, ví dụ và loại từ"
              placeholder="Tìm nghĩa tiếng Việt, ví dụ hoặc loại từ"
              placeholderTextColor={palette.textMuted}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              style={[styles.search, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surfaceSubtle }]}
            />

            {groups.length ? (
              <ScrollView
                horizontal
                testID="english-sense-pos-filters"
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filters}
                accessibilityLabel="Lọc theo loại từ"
              >
                {[
                  { key: "all", label: `Tất cả (${meanings.length})` },
                  ...groups.map((group) => ({
                    ...group,
                    label: `${group.label} (${meanings.filter((item) => groupFor(item).key === group.key).length})`,
                  })),
                ].map((group) => {
                  const active = activeGroup === group.key;
                  return (
                    <Pressable
                      key={group.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => setActiveGroup(group.key)}
                      style={[styles.filter, { backgroundColor: active ? palette.primary : palette.surfaceSubtle, borderColor: active ? palette.primary : palette.border }]}
                    >
                      <Text style={{ color: active ? "#FFFFFF" : palette.textPrimary, fontWeight: "700" }}>{group.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <ScrollView
              testID="english-sense-list"
              style={styles.senseList}
              contentContainerStyle={styles.senseContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {visibleMeanings.length ? visibleMeanings.map((item) => {
                const active = pending?.id === item.id;
                const expanded = expandedId === item.id;
                const group = groupFor(item);
                return (
                  <View key={item.id} style={[styles.senseRow, { borderColor: active ? palette.primary : palette.border, backgroundColor: active ? palette.primaryLight : palette.surface }]}>
                    <Pressable
                      testID={`english-sense-choice-${item.id}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${group.label}: ${item.shortMeaning || item.meaning}`}
                      onPress={() => {
                        setPending(item);
                        setMeaning(item.shortMeaning || item.meaning);
                      }}
                      style={styles.senseChoice}
                    >
                      <View style={styles.senseText}>
                        <Text style={[styles.pos, { color: palette.primary }]}>{group.label}</Text>
                        <Text numberOfLines={2} style={[styles.meaning, { color: palette.textPrimary }]}>
                          {item.shortMeaning || item.meaning}
                        </Text>
                      </View>
                      <Ionicons name={active ? "checkmark-circle" : "ellipse-outline"} size={21} color={active ? palette.primary : palette.textMuted} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${expanded ? "Thu gọn" : "Xem đầy đủ"} nghĩa: ${item.shortMeaning || item.meaning}`}
                      accessibilityState={{ expanded }}
                      onPress={() => setExpandedId(expanded ? null : item.id)}
                      style={styles.detailToggle}
                    >
                      <Text style={{ color: palette.primary, fontWeight: "700" }}>{expanded ? "Thu gọn" : "Chi tiết"}</Text>
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={palette.primary} />
                    </Pressable>
                    {expanded ? (
                      <View style={[styles.details, { borderTopColor: palette.border }]}>
                        {item.meaning !== item.shortMeaning ? <Text style={{ color: palette.textPrimary, lineHeight: 21 }}>{item.meaning}</Text> : null}
                        {item.usageNote ? <Text style={{ color: palette.textSecondary }}>Ghi chú: {item.usageNote}</Text> : null}
                        {item.example ? <Text style={[styles.example, { color: palette.textSecondary }]}>{item.example}</Text> : null}
                        {item.definitionEn ? <Text style={{ color: palette.textSecondary }}>{item.definitionEn}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                );
              }) : (
                <Text style={[styles.empty, { color: palette.textSecondary }]}>Không có nghĩa khớp bộ lọc này.</Text>
              )}
            </ScrollView>

            {allowManualMeaning ? (
              <TextInput
                testID="english-sense-custom-meaning"
                accessibilityLabel="Nghĩa tiếng Việt sẽ lưu, có thể chỉnh sửa"
                placeholder="Nghĩa sẽ lưu · có thể chỉnh sửa"
                placeholderTextColor={palette.textMuted}
                value={meaning}
                onChangeText={setMeaning}
                multiline
                maxLength={2000}
                style={[styles.meaningInput, { color: palette.textPrimary, borderColor: palette.border, backgroundColor: palette.surface }]}
              />
            ) : null}

            <View style={[styles.footer, { borderTopColor: palette.border }]}>
              <Text style={{ color: palette.textSecondary }}>
                {pending ? "Đã chọn 1 nghĩa" : allowManualMeaning && meaning.trim() ? "Đang dùng nghĩa tự nhập" : "Chưa chọn nghĩa"}
              </Text>
              <PrimaryButton
                label="Chọn nghĩa này"
                disabled={allowManualMeaning ? !meaning.trim() : !pending}
                onPress={confirm}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,23,42,0.50)" },
  keyboardFrame: { flex: 1, justifyContent: "flex-end" },
  sheet: { width: "100%", alignSelf: "center", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, paddingTop: 18, paddingHorizontal: 18, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, minWidth: 0, gap: 3 },
  headword: { fontSize: 23, lineHeight: 30, fontWeight: "800" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  pronunciationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  pronunciationCopy: { flex: 1, minWidth: 0, gap: 2 },
  pronunciationAudio: { width: 128, flexShrink: 0 },
  helper: { fontSize: 11, lineHeight: 16 },
  search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  filterScroll: { height: 44, minHeight: 44, maxHeight: 44, flexGrow: 0, flexShrink: 0 },
  filters: { gap: 8, paddingVertical: 2, alignItems: "center" },
  filter: { minHeight: 40, justifyContent: "center", paddingHorizontal: 13, borderWidth: 1, borderRadius: 20 },
  senseList: { flexGrow: 0, flexShrink: 1, minHeight: 90 },
  senseContent: { gap: 8, paddingBottom: 4 },
  senseRow: { borderWidth: 1, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 12 },
  senseChoice: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 10 },
  senseText: { flex: 1, minWidth: 0, gap: 2 },
  pos: { fontSize: 11, lineHeight: 15, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  meaning: { fontSize: 15, lineHeight: 20, fontWeight: "600" },
  detailToggle: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", minHeight: 36, gap: 5 },
  details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, gap: 7 },
  example: { fontStyle: "italic", lineHeight: 20 },
  empty: { textAlign: "center", paddingVertical: 20 },
  meaningInput: { minHeight: 58, maxHeight: 96, borderWidth: 1, borderRadius: 12, padding: 11, textAlignVertical: "top", fontSize: 15, lineHeight: 20 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 },
});
