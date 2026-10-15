import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { EnglishSensePickerModal } from "@/components/english/EnglishSensePickerModal";
import {
  listEnglishDecks,
  saveEnglishRecognizedBatch,
} from "@/db/english/learner";
import {
  buildEnglishBulkSavePlan,
  readEnglishBulkForm,
  saveEnglishBulkForm,
  type EnglishBulkForm,
  type EnglishBulkPreview,
} from "@/db/english/recognized-bulk";
import {
  lookupSkypediaBatch,
  parsePersonalEnglishList,
  SKYPEDIA_SOURCE,
  type SkypediaMeaning,
} from "@/db/english/skypedia";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { getSkypediaDictionary } from "@/services/languages/skypedia-runtime";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishBulk() {
  const params = useLocalSearchParams<{ deck?: string }>();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [form, setForm] = useState<EnglishBulkForm>({
    text: "",
    deck: "new",
    name: "",
    items: null,
  });
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<"lookup" | "save" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savedDeck, setSavedDeck] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [retry, setRetry] = useState(0);
  const [choiceLine, setChoiceLine] = useState<number | null>(null);
  const [pendingSense, setPendingSense] = useState<SkypediaMeaning | null>(null);
  const [manualMeaning, setManualMeaning] = useState("");
  const [previewFilter, setPreviewFilter] = useState<
    "all" | "choose" | "missing" | "duplicate" | "confirmed"
  >("all");
  const hydrated = useRef(false);
  const lock = useRef(false);
  const pendingDraft = useRef<Promise<void>>(Promise.resolve());
  useLanguageProtection(
    "DRAFT",
    !!busy || draftStatus === "Đang lưu bản nháp…",
  );

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void (async () => {
        const all = await listEnglishDecks(db);
        const saved = !hydrated.current || retry > 0 ? await readEnglishBulkForm(db) : null;
        const preferredDeck = typeof params.deck === "string" && all.some((deck) => deck.id === params.deck)
          ? params.deck
          : null;
        if (!live) return;
        setDecks(all);
        if (saved) {
          setForm({
            ...saved,
            deck:
              saved.text.trim()
                ? saved.deck === "new" || all.some((deck) => deck.id === saved.deck) ? saved.deck : "new"
                : preferredDeck ?? (saved.deck === "new" || all.some((deck) => deck.id === saved.deck) ? saved.deck : "new"),
          });
          hydrated.current = true;
        } else if (preferredDeck) {
          setForm((current) => ({ ...current, deck: preferredDeck }));
        }
        setReady(true);
        setError("");
      })().catch(() => {
        if (live) setError("Chưa tải được bộ từ hoặc bản nháp. Hãy thử lại.");
      });
      return () => {
        live = false;
      };
    }, [db, params.deck, retry]),
  );

  useEffect(() => {
    if (!ready || busy || notice) return;
    let live = true;
    pendingDraft.current = Promise.resolve().then(() => {
      if (live) setDraftStatus("Đang lưu bản nháp…");
      return saveEnglishBulkForm(db, form);
    });
    void pendingDraft.current
      .then(() => {
        if (live) setDraftStatus("Đã lưu bản nháp");
      })
      .catch(() => {
        if (live)
          setDraftStatus("Chưa lưu được bản nháp. Giữ màn hình và thử lại.");
      });
    return () => {
      live = false;
    };
  }, [db, form, ready, busy, notice]);

  const edit = (patch: Partial<EnglishBulkForm>) => {
    if (lock.current) return;
    setNotice("");
    setError("");
    setForm((old) => ({ ...old, ...patch }));
  };
  const updateItem = (line: number, patch: Partial<EnglishBulkPreview>) => {
    edit({
      items: form.items!.map((item) =>
        item.line === line ? { ...item, ...patch } : item,
      ),
    });
  };
  const savePlan = useMemo(
    () => buildEnglishBulkSavePlan(form.items ?? []),
    [form.items],
  );
  const issues = savePlan.issues;
  const included = form.items?.filter((item) => !item.excluded) ?? [];
  const eligible = savePlan.eligible;
  const lineCount = form.text
    .split(/\r\n|\n|\r/u)
    .filter((line) => line.trim()).length;
  const validTarget = form.deck !== "new" || !!form.name.trim();
  const statusOf = (item: EnglishBulkPreview) => {
    const issue = issues.get(item.line) ?? "";
    if (issue.includes("Trùng")) return "duplicate";
    if (!item.meanings.length && !item.meaning.trim()) return "missing";
    if (item.meanings.length > 1 && !item.selected && !item.meaning.trim())
      return "choose";
    return issue ? "missing" : "confirmed";
  };
  const statusCounts = {
    choose: included.filter((item) => statusOf(item) === "choose").length,
    missing: included.filter((item) => statusOf(item) === "missing").length,
    duplicate: included.filter((item) => statusOf(item) === "duplicate").length,
    confirmed: included.filter((item) => statusOf(item) === "confirmed").length,
  };
  const filteredItems = (form.items ?? []).filter((item) =>
    item.excluded ||
    previewFilter === "all" ||
    statusOf(item) === previewFilter,
  );
  const pickerItem = form.items?.find((item) => item.line === choiceLine) ?? null;
  const openMeaningPicker = (item: EnglishBulkPreview) => {
    setChoiceLine(item.line);
    setPendingSense(item.selected);
    setManualMeaning(item.meaning);
  };

  const recognize = async () => {
    if (lock.current || !ready) return;
    lock.current = true;
    setBusy("lookup");
    setError("");
    setNotice("");
    try {
      const lines = parsePersonalEnglishList(form.text);
      if (!lines.length) throw new Error("Hãy nhập ít nhất một từ tiếng Anh.");
      const lookupLines = lines.filter((line) => !line.issue && !line.meaning);
      const content = lookupLines.length
        ? await getSkypediaDictionary()
        : null;
      const matches = content
        ? await lookupSkypediaBatch(
            content,
            lookupLines.map((line) => line.headword),
          )
        : [];
      const byLine = new Map(
        lookupLines.map((line, index) => [line.line, matches[index] ?? []]),
      );
      const items: EnglishBulkPreview[] = [];
      for (const line of lines) {
        const meanings = byLine.get(line.line) ?? [];
        const selected = !line.meaning && meanings.length === 1 ? meanings[0]! : null;
        items.push({
          ...line,
          meanings,
          selected,
          headword: selected?.headword ?? line.headword,
          meaning: line.meaning || selected?.shortMeaning || "",
          excluded: false,
        });
      }
      setForm((old) => ({ ...old, items }));
      setPreviewFilter("all");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Chưa nhận diện được. Kiểm tra kết nối và thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };
  const save = async () => {
    if (lock.current || !eligible.length || !validTarget) return;
    lock.current = true;
    setBusy("save");
    setError("");
    try {
      await pendingDraft.current.catch(() => undefined);
      const deck = form.deck === "new" ? englishLocalId("deck") : form.deck;
      const eligibleLines = new Set(eligible.map((item) => item.line));
      const remaining = (form.items ?? []).filter(
        (item) => !item.excluded && !eligibleLines.has(item.line),
      );
      const nextForm: EnglishBulkForm = {
        text: remaining.map((item) => item.headword).join("\n"),
        deck,
        name: "",
        items: remaining.length ? remaining : null,
      };
      await saveEnglishRecognizedBatch(
        db,
        eligible.map((item) => {
          const sourced =
            item.selected &&
            [item.selected.shortMeaning, item.selected.meaning].some(
              (meaning) => item.meaning.trim() === meaning.trim(),
            );
          const sourceNotes = sourced
            ? [
                item.selected!.meaning !== item.selected!.shortMeaning
                  ? `Nghĩa đầy đủ từ nguồn: ${item.selected!.meaning}`
                  : "",
                item.selected!.usageNote
                  ? `Ghi chú nguồn: ${item.selected!.usageNote}`
                  : "",
                item.selected!.example
                  ? `Ví dụ: ${item.selected!.example}`
                  : "",
              ].filter(Boolean).join("\n")
            : "";
          return {
            id: englishLocalId("card"),
            deck_id: deck,
            headword: item.headword,
            meaning_vi: item.meaning,
            pos: sourced ? item.selected!.pos : "",
            ipa: sourced ? item.selected!.ipa : "",
            sense_id: sourced ? item.selected!.id : null,
            source_id: sourced ? SKYPEDIA_SOURCE : "USER",
            notes: sourceNotes,
          };
        }),
        form.deck === "new" ? form.name : undefined,
        remaining.length ? JSON.stringify(nextForm) : undefined,
      );
      setSavedDeck(deck);
      setNotice(
        `Đã thêm ${eligible.length} từ vào bộ “${form.deck === "new" ? form.name.trim() : decks.find((row) => row.id === deck)?.name}”.${remaining.length ? ` Còn ${remaining.length} dòng cần chọn nghĩa, sửa hoặc bỏ qua; bản nháp đã được giữ.` : ""}`,
      );
      setForm(nextForm);
      setDraftStatus(remaining.length ? `Đã giữ ${remaining.length} dòng còn lại trong bản nháp.` : "");
      setDecks(await listEnglishDecks(db));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Chưa lưu được danh sách. Bản nháp được giữ để thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };
  const box = { backgroundColor: p.surface, borderColor: p.border };
  return (
    <Screen
      scroll={!form.items}
      title={form.deck === "new" ? "Tạo bộ từ mới" : "Thêm từ vào bộ từ"}
      subtitle={form.items ? undefined : "Nhập nhiều từ · kiểm tra nghĩa · lưu vào bộ cá nhân"}
      avoidKeyboard
    >
      {!ready ? <ActivityIndicator color={p.primary} /> : null}
      {error ? (
        <View style={[s.alert, { backgroundColor: p.errorLight }]}>
          <Text accessibilityRole="alert" style={{ color: p.error }}>
            {error}
          </Text>
          {!ready ? (
            <PrimaryButton
              label="Thử tải lại"
              onPress={() => setRetry((n) => n + 1)}
            />
          ) : null}
        </View>
      ) : null}
      {notice && form.items ? (
        <View
          testID="english-bulk-partial-save-success"
          accessibilityLiveRegion="polite"
          style={[s.alert, { backgroundColor: p.successLight }]}
        >
          <Text style={{ color: p.success }}>{notice}</Text>
        </View>
      ) : null}
      {notice && !form.items ? (
        <View style={[s.panel, box]}>
          <Ionicons name="checkmark-circle" size={32} color={p.success} />
          <Text style={[s.heading, { color: p.textPrimary }]}>{notice}</Text>
          <Text style={{ color: p.textSecondary }}>
            Từ mới ở trạng thái Chưa học. Bắt đầu học để vào LV1 và nhận lịch
            ôn.
          </Text>
          <PrimaryButton
            label="Xem bộ vừa thêm"
            onPress={() =>
              router.replace(
                `/english?deck=${encodeURIComponent(savedDeck)}` as Href,
              )
            }
          />
        </View>
      ) : (
        <>
          {form.items ? (
              <View style={[s.targetCompact, box]}>
              <Text style={[s.label, { color: p.textSecondary }]}>{form.deck === "new" ? "Tên bộ từ" : "Lưu vào bộ từ"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.targetChips}>
                  {[{ id: "new", name: "+ Bộ mới" }, ...decks].map((deck) => (
                    <Pressable
                      key={deck.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: form.deck === deck.id }}
                      disabled={!!busy}
                      onPress={() => edit({ deck: deck.id })}
                      style={[
                        s.chip,
                        {
                          backgroundColor:
                            form.deck === deck.id ? p.primary : p.surfaceSubtle,
                        },
                      ]}
                    >
                      <Text style={{ color: form.deck === deck.id ? "white" : p.textPrimary }}>
                        {deck.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {form.deck === "new" ? (
                <TextInput
                  accessibilityLabel="Tên bộ từ mới"
                  placeholder="Nhập tên bộ từ"
                  placeholderTextColor={p.textMuted}
                  value={form.name}
                  maxLength={200}
                  editable={!busy}
                  onChangeText={(name) => edit({ name })}
                  style={[s.input, s.targetName, { color: p.textPrimary, borderColor: p.border }]}
                />
              ) : null}
            </View>
          ) : (
            <View style={[s.panel, box]}>
              <Text style={[s.heading, { color: p.textPrimary }]}>{form.deck === "new" ? "Tên bộ từ" : "Chọn bộ từ"}</Text>
              <View style={s.wrap}>
                {[{ id: "new", name: "+ Bộ mới" }, ...decks].map((deck) => (
                  <Pressable
                    key={deck.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: form.deck === deck.id }}
                    disabled={!!busy}
                    onPress={() => edit({ deck: deck.id })}
                    style={[s.chip, { backgroundColor: form.deck === deck.id ? p.primary : p.surfaceSubtle }]}
                  >
                    <Text style={{ color: form.deck === deck.id ? "white" : p.textPrimary }}>{deck.name}</Text>
                  </Pressable>
                ))}
              </View>
              {form.deck === "new" ? (
                <TextInput
                  accessibilityLabel="Tên bộ từ muốn học"
                  placeholder="Nhập tên bộ từ"
                  placeholderTextColor={p.textMuted}
                  value={form.name}
                  maxLength={200}
                  editable={!busy}
                  onChangeText={(name) => edit({ name })}
                  style={[s.input, { color: p.textPrimary, borderColor: p.border }]}
                />
              ) : null}
            </View>
          )}
          {!form.items ? (
            <View style={[s.panel, box]}>
              <Text style={[s.heading, { color: p.textPrimary }]}>
                Danh sách từ
              </Text>
              <Text style={[s.copy, { color: p.textSecondary }]}>
                Mỗi dòng một từ hoặc cụm từ. Hệ thống tra nghĩa, loại từ, IPA và
                ví dụ từ từ điển Anh–Việt. Bạn kiểm tra và bỏ từ không phù hợp
                trước khi lưu.
              </Text>
              <TextInput
                testID="english-personal-list-input"
                accessibilityLabel="Danh sách từ tiếng Anh, mỗi dòng một từ"
                placeholder={"hello\nlove\nshorts\nlook up"}
                placeholderTextColor={p.textMuted}
                value={form.text}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={230000}
                editable={ready && !busy}
                onChangeText={(text) => edit({ text })}
                style={[
                  s.input,
                  s.area,
                  { color: p.textPrimary, borderColor: p.border },
                ]}
              />
              <Text
                style={{ color: lineCount > 100 ? p.error : p.textSecondary }}
              >
                {lineCount}/100 từ · Có thể dán 2 cột từ + nghĩa, cách nhau bằng
                TAB.
              </Text>
              <PrimaryButton
                label={busy === "lookup" ? "Đang nhận diện…" : "Nhận diện từ"}
                disabled={
                  !ready || !!busy || !form.text.trim() || lineCount > 100
                }
                onPress={() => void recognize()}
              />
              {busy === "lookup" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[s.copy, { color: p.textSecondary }]}
                >
                  Lần đầu có thể cần tải khoảng 42 MB từ điển. Sau khi tải xong,
                  bạn có thể tra offline.
                </Text>
              ) : null}
            </View>
          ) : (
            <>
            <View style={s.previewRegion}>
            <FlatList
              testID="english-bulk-preview-list"
              data={filteredItems}
              keyExtractor={(item) => String(item.line)}
              style={s.previewList}
              contentContainerStyle={s.previewContent}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={7}
              ListHeaderComponent={
              <View style={s.previewHeader}>
                  <View style={[s.previewSummary, box]}>
                <View style={s.summaryTop}>
                  <Text style={[s.summaryTitle, { color: p.textPrimary }]}>Kiểm tra danh sách</Text>
                  <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => edit({ items: null })} style={s.touch}>
                    <Text style={{ color: p.primary }}>Sửa danh sách</Text>
                  </Pressable>
                </View>
                <Text numberOfLines={2} style={[s.summaryCopy, { color: p.textSecondary }]}>
                  {form.items.length} nhập · {form.items.filter((item) => item.meanings.length > 0).length} khớp · {form.items.filter((item) => item.meanings.length > 1).length} nhiều nghĩa · {form.items.filter((item) => !item.meanings.length).length} tự nhập · {statusCounts.duplicate} trùng
                </Text>
                <Text numberOfLines={1} style={[s.summaryCopy, { color: issues.size ? p.error : p.textSecondary }]}>
                  {eligible.length} sẵn sàng lưu · {issues.size} cần chọn/sửa · {savePlan.excludedCount} đã bỏ
                </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
                    {([
                      ["all", `Tất cả (${form.items.length})`],
                      ["choose", `Chọn nghĩa (${statusCounts.choose})`],
                      ["missing", `Tự nhập (${statusCounts.missing})`],
                      ["duplicate", `Trùng (${statusCounts.duplicate})`],
                      ["confirmed", `Đã xác nhận (${statusCounts.confirmed})`],
                    ] as const).map(([filter, label]) => (
                      <Pressable key={filter} accessibilityRole="radio" accessibilityState={{ selected: previewFilter === filter }} onPress={() => setPreviewFilter(filter)} style={[s.filterChip, { backgroundColor: previewFilter === filter ? p.primary : p.surface, borderColor: p.border }]}>
                        <Text style={{ color: previewFilter === filter ? "white" : p.textPrimary }}>{label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              }
              renderItem={({ item }) => item.excluded ? (
                <View style={[s.excluded, box]}>
                  <Text style={{ color: p.textMuted, flex: 1 }}>Đã bỏ: {item.headword}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Giữ lại ${item.headword}`} disabled={!!busy} onPress={() => updateItem(item.line, { excluded: false })} style={s.touch}>
                    <Text style={{ color: p.primary }}>Hoàn tác</Text>
                  </Pressable>
                </View>
              ) : (
                <View testID={`english-preview-row-${item.line}`} style={[s.compactRow, box]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Chọn nghĩa hoặc sửa ${item.headword}, dòng ${item.line}`} disabled={!!busy} onPress={() => openMeaningPicker(item)} style={s.compactMain}>
                    <View style={s.compactTitleRow}>
                      <Text numberOfLines={1} style={[s.word, s.compactWord, { color: p.primary }]}>{item.headword}</Text>
                      <Text style={[s.status, { color: statusOf(item) === "confirmed" ? p.success : statusOf(item) === "duplicate" || statusOf(item) === "missing" ? p.error : p.textSecondary, borderColor: p.border }]}>{statusOf(item) === "confirmed" ? "Đã xác nhận" : statusOf(item) === "duplicate" ? "Trùng" : statusOf(item) === "missing" ? "Cần kiểm tra" : statusOf(item) === "choose" ? `${item.meanings.length} nghĩa` : "Tự nhập"}</Text>
                    </View>
                    <Text numberOfLines={2} style={{ color: p.textSecondary }}>
                      {item.selected ? [item.selected.pos, item.selected.ipa ? `${item.selected.ipa}${item.selected.ipaRegion ? ` · ${item.selected.ipaRegion}` : " · chưa ghi vùng giọng"}` : "", item.selected.shortMeaning].filter(Boolean).join(" · ") : item.meanings.length ? "Chưa chọn nghĩa · chạm để xem theo loại từ" : item.meaning || "Không tìm thấy · nhập nghĩa của bạn"}
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Bỏ ${item.headword} khỏi danh sách, dòng ${item.line}`} disabled={!!busy} onPress={() => updateItem(item.line, { excluded: true })} style={[s.close, { backgroundColor: p.errorLight }]}>
                    <Ionicons name="close" size={22} color={p.error} />
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: p.textSecondary, padding: 16 }}>Không có dòng trong bộ lọc này.</Text>}
            />
            </View>
            <View style={[s.stickyFooter, { backgroundColor: p.surface, borderColor: p.border }]}>
              {!validTarget ? <Text style={{ color: p.error }}>Điền tên bộ mới ở phía trên trước khi lưu.</Text> : null}
              <PrimaryButton label={busy === "save" ? "Đang lưu…" : `Thêm ${eligible.length} từ`} disabled={!!busy || !eligible.length || !validTarget} onPress={() => void save()} />
              <Text accessibilityLiveRegion="polite" style={[s.copy, { color: issues.size ? p.error : p.textMuted }]}>{draftStatus || `${eligible.length} sẵn sàng lưu · ${issues.size} cần chọn/sửa hoặc bỏ qua · ${savePlan.excludedCount} đã bỏ`}</Text>
            </View>
            </>
          )}
          {draftStatus && !form.items ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[s.copy, { color: p.textMuted }]}
            >
              {draftStatus}
            </Text>
          ) : null}
        </>
      )}
      {!form.items ? <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nguồn từ điển Anh–Việt và ghi công"
        onPress={() => router.push("/english/dictionary-source" as Href)}
        style={s.touch}
      >
        <Text style={{ color: p.primary }}>
          Từ điển Skypedia · Xem nguồn dữ liệu & ghi công
        </Text>
      </Pressable> : null}

      {choiceLine !== null ? <EnglishSensePickerModal
        visible={choiceLine !== null}
        headword={pickerItem?.headword ?? ""}
        meanings={pickerItem?.meanings ?? []}
        selected={pendingSense}
        initialMeaning={manualMeaning}
        allowManualMeaning
        onClose={() => setChoiceLine(null)}
        onConfirm={(selected, selectedMeaning) => {
          if (!pickerItem) return;
          updateItem(pickerItem.line, {
            selected,
            meaning: selectedMeaning,
            headword: selected?.headword ?? pickerItem.headword,
          });
          setChoiceLine(null);
        }}
      /> : null}
    </Screen>
  );
}
const s = StyleSheet.create({
  panel: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginBottom: 16,
  },
  heading: { fontSize: 20, fontWeight: "800" },
  copy: { fontSize: 14, lineHeight: 21 },
  word: { fontSize: 25, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 44,
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 17,
    minHeight: 52,
  },
  area: { minHeight: 220, textAlignVertical: "top" },
  label: { fontSize: 13, fontWeight: "700" },
  close: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  touch: { minHeight: 44, justifyContent: "center", paddingVertical: 10 },
  choice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    minHeight: 48,
  },
  targetCompact: {
    padding: 7,
    borderWidth: 1,
    borderRadius: 14,
    gap: 3,
  },
  targetChips: { flexDirection: "row", gap: 6, alignItems: "center" },
  targetName: { minHeight: 44, paddingVertical: 8 },
  previewRegion: { flex: 1, minHeight: 0 },
  previewList: { flex: 1, minHeight: 0 },
  previewContent: { paddingBottom: 8 },
  previewHeader: { gap: 5, paddingBottom: 5 },
  previewSummary: { padding: 8, borderRadius: 14, borderWidth: 1, gap: 2 },
  summaryTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  summaryTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
  summaryCopy: { fontSize: 12, lineHeight: 16 },
  filterRow: { gap: 8, paddingBottom: 4 },
  filterChip: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  compactMain: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center", gap: 3 },
  compactTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactWord: { fontSize: 18, flex: 1 },
  status: { fontSize: 11, borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  stickyFooter: { borderTopWidth: 1, paddingTop: 8, gap: 4 },
  excluded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  alert: { padding: 16, borderRadius: 14, marginBottom: 14 },
});
