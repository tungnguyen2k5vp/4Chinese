import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  listTrashedEnglishDecks,
  setEnglishDeckTrashed,
} from "@/db/english/decks";
import {
  createEnglishDeck,
  englishDeckShareSnapshot,
  importEnglishSharedDeck,
  type EnglishCardInput,
} from "@/db/english/learner";
import { listEnglishDeckSummaries } from "@/db/english/personal-vocabulary";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import {
  createEnglishSharedDeckPayload,
  EnglishDeckShareError,
  fetchEnglishDeck,
  publishEnglishDeck,
} from "@/services/english/deck-share";
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { englishLocalId } from "@/services/languages/ids";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

type DeckRow = { id: string; name: string; wordCount: number; dueCount: number };

export default function EnglishDeckManager() {
  const modalAnimation = useModalAnimationType();
  const db = useEnglishDatabase();
  const theme = useTheme();
  const p = getEnglishPalette(theme.mode === "dark");
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [trashCount, setTrashCount] = useState(0);
  const [name, setName] = useState("");
  const [friendCode, setFriendCode] = useState("");
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const lock = useRef(false);

  useLanguageProtection("DRAFT", !!name.trim() || saving || importing);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [active, trashed] = await Promise.all([
        listEnglishDeckSummaries(db),
        listTrashedEnglishDecks(db),
      ]);
      setDecks(active);
      setTrashCount(trashed.length);
      setError("");
    } catch {
      setError("Chưa tải được danh sách bộ từ. Dữ liệu vẫn được giữ nguyên.");
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const create = async () => {
    const cleanName = name.trim().replace(/\s+/gu, " ").slice(0, 60);
    if (!cleanName || lock.current) return;
    lock.current = true;
    setSaving(true);
    setError("");
    const id = englishLocalId("deck");
    try {
      await createEnglishDeck(db, id, cleanName);
      setName("");
      router.push(`/english/decks/${encodeURIComponent(id)}` as Href);
    } catch {
      setError("Chưa tạo được bộ từ. Tên và dữ liệu hiện có vẫn được giữ.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  const share = async (deck: DeckRow) => {
    if (sharing) return;
    setSharing(true);
    try {
      const snapshot = await englishDeckShareSnapshot(db, deck.id);
      const payload = createEnglishSharedDeckPayload(snapshot.name, snapshot.words.map((word) => ({
        headword: word.headword,
        meaningVi: word.meaning_vi,
        pos: word.pos,
        ipa: word.ipa,
      })));
      const code = await publishEnglishDeck(payload);
      await Share.share({
        title: `Bộ từ tiếng Anh ${deck.name}`,
        message: `Mời bạn thêm bộ từ tiếng Anh “${deck.name}” trong 4Chinese bằng mã này: ${code}`,
      });
    } catch (failure) {
      const message = failure instanceof EnglishDeckShareError
        ? failure.message
        : failure instanceof Error && failure.message === "ENGLISH_SHARE_EMPTY"
          ? "Hãy thêm ít nhất một từ vào bộ trước khi chia sẻ."
          : failure instanceof Error && failure.message === "ENGLISH_SHARE_LIMIT"
            ? "Mỗi mã chia sẻ hỗ trợ tối đa 500 từ. Hãy tách bộ thành các phần nhỏ hơn."
            : "Không tạo được mã chia sẻ. Hãy kiểm tra kết nối mạng rồi thử lại.";
      Alert.alert("Chưa thể chia sẻ bộ từ", message);
    } finally {
      setSharing(false);
    }
  };

  const addFriendDeck = async () => {
    if (!friendCode.trim() || importing || lock.current) return;
    lock.current = true;
    setImporting(true);
    try {
      const payload = await fetchEnglishDeck(friendCode);
      if (!payload) {
        Alert.alert("Mã chưa đúng", "Nhập mã 8 ký tự của một bộ từ tiếng Anh được chia sẻ.");
        return;
      }
      const deckId = englishLocalId("deck");
      const cards: EnglishCardInput[] = payload.words.map((word) => ({
        id: englishLocalId("card"),
        deck_id: deckId,
        headword: word.headword,
        meaning_vi: word.meaningVi,
        pos: word.pos,
        ipa: word.ipa,
        sense_id: null,
        source_id: "SHARED",
      }));
      await importEnglishSharedDeck(db, deckId, payload.name, cards);
      setFriendModalVisible(false);
      setFriendCode("");
      await load();
      Alert.alert("Đã thêm bộ từ", `Đã nhập ${cards.length} từ trong “${payload.name}”.`, [
        { text: "Mở bộ từ", onPress: () => router.push(`/english/decks/${encodeURIComponent(deckId)}` as Href) },
        { text: "Để sau", style: "cancel" },
      ]);
    } catch (failure) {
      Alert.alert(
        "Chưa thể thêm bộ từ",
        failure instanceof EnglishDeckShareError
          ? failure.message
          : "Không thể tải hoặc lưu bộ từ. Bộ từ của bạn chưa bị thay đổi; hãy thử lại.",
      );
    } finally {
      lock.current = false;
      setImporting(false);
    }
  };

  const archive = (deck: DeckRow) => {
    if (deletingId) return;
    Alert.alert(
      `Đưa “${deck.name}” vào thùng rác?`,
      "Các từ và lịch ôn được giữ nguyên để bạn khôi phục sau.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đưa vào thùng rác",
          style: "destructive",
          onPress: () => {
            setDeletingId(deck.id);
            void setEnglishDeckTrashed(db, deck.id, true)
              .then(() => load())
              .catch(() => setError("Chưa chuyển được bộ từ vào thùng rác. Hãy thử lại."))
              .finally(() => setDeletingId(null));
          },
        },
      ],
    );
  };

  return (
    <Screen title="Bộ từ riêng" subtitle="Tạo bộ từ hoặc mở bộ để học." hideTitle compact avoidKeyboard>
      <View style={[s.createCard, { backgroundColor: p.surface, borderColor: p.border }]}>
        <Text style={[s.eyebrow, { color: p.primary }]}>TẠO BỘ TỪ MỚI</Text>
        <TextInput
          accessibilityLabel="Tên bộ từ tiếng Anh mới"
          value={name}
          onChangeText={setName}
          maxLength={60}
          editable={!saving}
          returnKeyType="done"
          onSubmitEditing={() => void create()}
          placeholder="Ví dụ: Tiếng Anh công việc"
          placeholderTextColor={p.textMuted}
          style={[s.input, { color: p.textPrimary, backgroundColor: p.surfaceSubtle, borderColor: p.border }]}
        />
        <PrimaryButton label="Tạo bộ từ" loading={saving} disabled={!name.trim()} onPress={() => void create()} />
      </View>

      <View style={s.tools}>
        <Pressable accessibilityRole="button" onPress={() => setFriendModalVisible(true)} style={[s.tool, { backgroundColor: p.primaryLight }]}>
          <Ionicons name="people-outline" size={20} color={p.primary} />
          <Text style={{ color: p.primary, fontWeight: "700" }}>Nhập mã bộ từ</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/english/deck-trash" as Href)} style={[s.tool, { borderWidth: 1, borderColor: p.border }]}>
          <Ionicons name="trash-outline" size={20} color={p.textMuted} />
          <Text style={{ color: p.textSecondary }}>{trashCount ? `Thùng rác (${trashCount})` : "Thùng rác"}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={[s.alert, { backgroundColor: p.errorLight }]}>
          <Text accessibilityRole="alert" style={{ color: p.error }}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void load()} style={s.touch}>
            <Text style={{ color: p.primary, fontWeight: "800" }}>Thử tải lại</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={p.primary} />
          <Text style={{ color: p.textSecondary }}>Đang tải bộ từ…</Text>
        </View>
      ) : decks.length ? (
        <View style={s.list}>
          <Text style={[s.sectionTitle, { color: p.textPrimary }]}>Bộ từ của bạn ({decks.length})</Text>
          {decks.map((deck) => (
            <View key={deck.id} style={[s.deckCard, { backgroundColor: p.surface, borderColor: p.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mở bộ từ ${deck.name}, ${deck.wordCount} từ, ${deck.dueCount} đến hạn`}
                onPress={() => router.push(`/english/decks/${encodeURIComponent(deck.id)}` as Href)}
                style={s.deckMain}
              >
                <View style={[s.deckIcon, { backgroundColor: p.primaryLight }]}>
                  <Ionicons name="albums" size={23} color={p.primary} />
                </View>
                <View style={s.deckCopy}>
                  <Text numberOfLines={2} style={[s.deckName, { color: p.textPrimary }]}>{deck.name}</Text>
                  <Text style={{ color: p.textMuted }}>{deck.wordCount} từ · {deck.dueCount} đến hạn</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={p.textMuted} />
              </Pressable>
              <View style={s.deckActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Chia sẻ bộ từ ${deck.name}`}
                  disabled={sharing}
                  onPress={() => void share(deck)}
                  style={[s.iconButton, { backgroundColor: p.primaryLight }]}
                >
                  {sharing ? <ActivityIndicator size="small" color={p.primary} /> : <Ionicons name="share-outline" size={18} color={p.primary} />}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Đưa bộ từ ${deck.name} vào thùng rác`}
                  disabled={deletingId !== null}
                  onPress={() => archive(deck)}
                  style={[s.iconButton, { backgroundColor: p.errorLight }]}
                >
                  {deletingId === deck.id ? <ActivityIndicator size="small" color={p.error} /> : <Ionicons name="trash-outline" size={18} color={p.error} />}
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : !error ? (
        <View style={[s.emptyCard, { backgroundColor: p.surface, borderColor: p.border }]}>
          <Ionicons name="albums-outline" size={30} color={p.primary} />
          <Text style={[s.emptyTitle, { color: p.textPrimary }]}>Chưa có bộ từ riêng</Text>
          <Text style={{ color: p.textSecondary, textAlign: "center", lineHeight: 21 }}>
            Tạo bộ đầu tiên rồi thêm những từ tiếng Anh bạn muốn ghi nhớ.
          </Text>
        </View>
      ) : null}

      <Modal visible={friendModalVisible} animationType={modalAnimation === 'none' ? 'none' : 'fade'} transparent onRequestClose={() => setFriendModalVisible(false)}>
        <View style={[s.modalBackdrop, { backgroundColor: theme.overlay }]}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalWrap}>
            <View style={[s.modalCard, { backgroundColor: p.surface, borderColor: p.border }]}>
              <View style={s.modalHeading}>
                <Text style={[s.modalTitle, { color: p.textPrimary }]}>Thêm bộ từ của bạn bè</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setFriendModalVisible(false)} style={s.closeButton}>
                  <Ionicons name="close" size={22} color={p.textMuted} />
                </Pressable>
              </View>
              <Text style={{ color: p.textSecondary, lineHeight: 21 }}>
                Nhập mã 8 ký tự bạn bè đã gửi. Bộ từ được chép vào thiết bị này; tiến độ học riêng của họ không được nhập.
              </Text>
              <TextInput
                accessibilityLabel="Mã chia sẻ bộ từ tiếng Anh"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={32}
                value={friendCode}
                onChangeText={setFriendCode}
                onSubmitEditing={() => void addFriendDeck()}
                placeholder="Ví dụ: K7M9X2QF"
                placeholderTextColor={p.textMuted}
                returnKeyType="done"
                style={[s.input, s.codeInput, { color: p.textPrimary, backgroundColor: p.surfaceSubtle, borderColor: p.border }]}
              />
              <View style={s.modalActions}>
                <PrimaryButton variant="secondary" label="Hủy" onPress={() => { setFriendModalVisible(false); setFriendCode(""); }} style={s.modalAction} />
                <PrimaryButton label="Thêm bộ từ" loading={importing} disabled={!friendCode.trim()} onPress={() => void addFriendDeck()} style={s.modalAction} />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  tools: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tool: { flexGrow: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  createCard: { padding: 16, borderWidth: 1, borderRadius: 22, gap: 12 },
  eyebrow: { fontSize: 13, fontWeight: "900", letterSpacing: 0.8 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 17 },
  list: { gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "900", marginBottom: 2 },
  deckCard: { borderWidth: 1, borderRadius: 20, padding: 12, gap: 10 },
  deckMain: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58 },
  deckIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  deckCopy: { flex: 1, minWidth: 0, gap: 4 },
  deckName: { fontSize: 17, fontWeight: "900" },
  deckActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  emptyCard: { alignItems: "center", gap: 9, borderWidth: 1, borderRadius: 22, padding: 22 },
  emptyTitle: { fontSize: 18, fontWeight: "900" },
  loading: { minHeight: 100, alignItems: "center", justifyContent: "center", gap: 10 },
  alert: { padding: 14, borderRadius: 14, gap: 5 },
  touch: { minHeight: 44, justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 18 },
  modalWrap: { width: "100%", maxWidth: 560, alignSelf: "center" },
  modalCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 14 },
  modalHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { flex: 1, fontSize: 22, fontWeight: "900" },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  codeInput: { minHeight: 58, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 },
  modalActions: { flexDirection: "row", gap: 8 },
  modalAction: { flex: 1 },
});
