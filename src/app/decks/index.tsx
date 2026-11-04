import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  createPersonalDeck,
  deletePersonalDeck,
  importSharedDeck,
  listDeletedPersonalDecks,
  listPersonalDecks,
} from "@/db/repository";
import { useModalAnimationType } from '@/hooks/use-reduced-motion';
import type { SharedDeckPayload } from "@/services/decks/share-code";
import { fetchSharedDeck, ShortDeckShareError } from "@/services/decks/short-share";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { PersonalDeck } from "@/types/models";

export default function Decks() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const modalAnimation = useModalAnimationType();
  const styles = useThemeStyles(createStyles);
  const cardStyle = themedCard(theme);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [importingFriendDeck, setImportingFriendDeck] = useState(false);
  const importBusy = useRef(false);
  const [friendPayload, setFriendPayload] = useState<SharedDeckPayload | null>(null);
  const [restoreFriendProgress, setRestoreFriendProgress] = useState(true);
  const [friendError, setFriendError] = useState("");
  const load = useCallback(() => {
    void Promise.all([listPersonalDecks(db), listDeletedPersonalDecks(db)]).then(
      ([activeDecks, deletedDecks]) => {
        setDecks(activeDecks);
        setDeletedCount(deletedDecks.length);
      },
    );
  }, [db]);
  useFocusEffect(load);
  const create = async () => {
    if (!name.trim()) {
      Alert.alert("Thiếu tên bộ từ", "Hãy đặt một tên dễ nhớ.");
      return;
    }
    setSaving(true);
    try {
      const id = await createPersonalDeck(db, name);
      setName("");
      setCreateModalVisible(false);
      router.push(`/decks/${id}` as Href);
    } catch {
      Alert.alert("Chưa tạo được bộ từ", "Dữ liệu vẫn được giữ nguyên. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };
  const archive = async (deck: PersonalDeck) => {
    if (deletingId) return;
    setDeletingId(deck.id);
    try {
      await deletePersonalDeck(db, deck.id);
      setDecks((current) => current.filter((item) => item.id !== deck.id));
      setDeletedCount((count) => count + 1);
    } catch {
      Alert.alert("Chưa thể xóa bộ từ", "Vui lòng thử lại sau.");
    } finally {
      setDeletingId(null);
    }
  };
  const confirmArchive = (deck: PersonalDeck) => {
    if (deletingId) return;
    Alert.alert(
      `Xóa “${deck.name}”?`,
      "Bộ từ sẽ được chuyển vào thùng rác. Các từ và lịch ôn vẫn được giữ để khôi phục.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đưa vào thùng rác",
          style: "destructive",
          onPress: () => void archive(deck),
        },
      ],
    );
  };
  const previewFriendDeck = async () => {
    if (importBusy.current) return;
    importBusy.current = true;
    setImportingFriendDeck(true);
    setFriendError("");
    try {
      const payload = await fetchSharedDeck(friendCode);
      if (!payload) {
        setFriendError("Không tìm thấy bộ từ. Hãy kiểm tra lại mã 8 ký tự người chia sẻ đã gửi.");
        return;
      }
      setFriendPayload(payload);
      setRestoreFriendProgress(true);
    } catch (error) {
      setFriendError(error instanceof ShortDeckShareError ? error.message : "Không thể đọc mã bộ từ. Hãy kiểm tra kết nối và thử lại.");
    } finally {
      importBusy.current = false;
      setImportingFriendDeck(false);
    }
  };
  const addFriendDeck = async () => {
    if (!friendPayload || importBusy.current) return;
    importBusy.current = true;
    setImportingFriendDeck(true);
    setFriendError("");
    try {
      const outcome = await importSharedDeck(db, friendPayload, friendPayload.version === 2 && restoreFriendProgress);
      setFriendModalVisible(false);
      setFriendCode("");
      setFriendPayload(null);
      load();
      router.push(`/decks/${outcome.deckId}` as Href);
    } catch (error) {
      setFriendError(error instanceof Error ? error.message : "Chưa thể thêm bộ từ. Dữ liệu học vẫn được giữ nguyên.");
    } finally {
      importBusy.current = false;
      setImportingFriendDeck(false);
    }
  };
  return (
    <Screen
      title="Bộ từ riêng"
      hideTitle
      subtitle="Tự chọn từ cần học, sửa nghĩa theo ngữ cảnh của bạn và ôn bằng lịch cấp nhớ."
    >
      <PrimaryButton
        label="＋  Tạo bộ từ mới"
        onPress={() => setCreateModalVisible(true)}
      />
      <View style={styles.secondaryActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/decks/trash" as Href)}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
        >
          <Ionicons name="trash-outline" size={18} color={theme.primaryText} />
          <Text style={styles.secondaryActionText} numberOfLines={1}>
            {deletedCount ? `Thùng rác (${deletedCount})` : "Thùng rác"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => { setFriendError(""); setFriendPayload(null); setFriendModalVisible(true); }}
          style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}
        >
          <Ionicons name="people-outline" size={19} color={theme.primaryText} />
          <Text style={styles.secondaryActionText} numberOfLines={1}>Thêm bộ bạn bè</Text>
        </Pressable>
      </View>
      {decks.length ? (
        decks.map((deck) => (
          <View key={deck.id} style={[cardStyle, styles.deck]}>
            <Pressable
              style={styles.deckMain}
              accessibilityRole="button"
              accessibilityLabel={`Mở bộ ${deck.name}, ${deck.wordCount} từ, ${deck.dueCount} đến hạn`}
              onPress={() => router.push(`/decks/${deck.id}` as Href)}
            >
              <View
                style={[styles.icon, { backgroundColor: `${deck.color}18` }]}
              >
                <Ionicons name="albums" size={25} color={deck.color} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{deck.name}</Text>
                <Text style={styles.meta}>
                  {deck.wordCount} từ · {deck.dueCount} đến hạn
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textMuted}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tùy chọn bộ ${deck.name}`}
              accessibilityHint="Mở bộ từ hoặc chuyển bộ từ vào thùng rác để có thể khôi phục sau."
              disabled={deletingId !== null}
              onPress={() => Alert.alert(`Bộ từ: ${deck.name}`, "Chọn một thao tác.", [
                { text: "Mở bộ từ", onPress: () => router.push(`/decks/${deck.id}` as Href) },
                { text: "Đưa vào thùng rác", style: "destructive", onPress: () => confirmArchive(deck) },
                { text: "Đóng", style: "cancel" },
              ])}
              style={({ pressed }) => [
                styles.moreButton,
                pressed && styles.deletePressed,
                deletingId !== null && styles.deleteDisabled,
              ]}
            >
              {deletingId === deck.id ? (
                <ActivityIndicator color={theme.error} size="small" />
              ) : (
                <Ionicons name="ellipsis-vertical" size={20} color={theme.textMuted} />
              )}
            </Pressable>
          </View>
        ))
      ) : (
        <EmptyState
          icon="册"
          variant="vocabulary"
          scene="deck"
          title="Chưa có bộ từ riêng"
          message="Tạo bộ đầu tiên rồi thêm những từ thực sự hữu ích với bạn."
        />
      )}
      <Modal
        visible={createModalVisible}
        animationType={modalAnimation}
        transparent
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <View style={[cardStyle, styles.modalCard]}>
            <Text style={styles.modalTitle}>Tạo bộ từ mới</Text>
            <Text style={styles.modalDescription}>Đặt tên trước, bạn có thể thêm từ ngay sau đó.</Text>
            <TextInput
              returnKeyType="done"
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => void create()}
              placeholder="Ví dụ: Tiếng Trung công việc"
              placeholderTextColor={theme.textMuted}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                variant="secondary"
                label="Hủy"
                onPress={() => { setCreateModalVisible(false); setName(""); }}
                style={styles.modalAction}
              />
              <PrimaryButton
                label="Tạo bộ từ"
                loading={saving}
                disabled={!name.trim()}
                onPress={() => void create()}
                style={styles.modalAction}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={friendModalVisible}
        animationType={modalAnimation}
        transparent
        onRequestClose={() => { if (!importingFriendDeck) setFriendModalVisible(false); }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBackdrop}>
          <ScrollView style={styles.importScroll} contentContainerStyle={[cardStyle, styles.modalCard]} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Nhập mã bộ từ</Text>
            <Text style={styles.modalDescription}>
              Nhập mã 8 ký tự từ nút “Chia sẻ” của bộ từ. Mã mới có thể kèm tiến độ học.
            </Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={1_000_000}
              value={friendCode}
              editable={!importingFriendDeck}
              onChangeText={(value) => { setFriendCode(value); setFriendPayload(null); setFriendError(""); }}
              placeholder="Ví dụ: K7M9X2QF"
              placeholderTextColor={theme.textMuted}
              style={styles.shareCodeInput}
            />
            {friendPayload ? <>
              <Text style={styles.modalTitle}>{friendPayload.name}</Text>
              <Text style={styles.modalDescription}>{friendPayload.words.length} từ{friendPayload.version === 2
                ? ` · ${friendPayload.words.filter((word) => word.progress?.studied).length} đã học/đã biết`
                : " · Mã này chỉ chứa từ vựng, không có tiến độ của người gửi."}</Text>
              {friendPayload.version === 2 ? <>
                <Text style={styles.modalDescription}>Tiến độ lúc {new Date(friendPayload.snapshotAt!).toLocaleString("vi-VN")}. Hai máy học độc lập sau khi nhập.</Text>
                <View style={styles.shareToggle}>
                  <Text style={[styles.modalDescription, { flex: 1 }]}>Nhập kèm tiến độ người chia sẻ</Text>
                  <Switch accessibilityLabel="Nhập kèm tiến độ người chia sẻ" value={restoreFriendProgress}
                    disabled={importingFriendDeck} onValueChange={setRestoreFriendProgress} />
                </View>
                <Text style={[styles.modalDescription, restoreFriendProgress && { color: theme.error }]}>{restoreFriendProgress
                  ? "Tiến độ các từ trong mã sẽ thay thế tiến độ đang có, kể cả khi từ nằm trong bộ khác. Không nhập XP, ghi chú hoặc lịch sử từng lượt ôn."
                  : "Chỉ thêm từ vựng; giữ tiến độ đang có trên máy này."}</Text>
              </> : null}
            </> : null}
            {friendError ? <Text accessibilityRole="alert" style={{ color: theme.error }}>{friendError}</Text> : null}
            <View style={styles.modalActions}>
              <PrimaryButton
                variant="secondary"
                label="Hủy"
                disabled={importingFriendDeck}
                onPress={() => { setFriendModalVisible(false); setFriendCode(""); setFriendPayload(null); }}
                style={styles.modalAction}
              />
              <PrimaryButton
                label={friendPayload ? friendPayload.version === 2 && restoreFriendProgress ? "Nhập kèm tiến độ" : "Thêm bộ từ" : "Xem trước bộ từ"}
                loading={importingFriendDeck}
                disabled={!friendCode.trim()}
                onPress={() => void (friendPayload ? addFriendDeck() : previewFriendDeck())}
                style={styles.modalAction}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  secondaryActions: { flexDirection: "row", gap: spacing.sm },
  secondaryAction: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: theme.primarySoft },
  secondaryActionText: { color: theme.primaryText, fontSize: 12, fontWeight: "800", flexShrink: 1 },
  actionPressed: { opacity: 0.72 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: theme.textPrimary,
    backgroundColor: theme.background,
  },
  deck: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deckMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1 },
  name: { fontSize: 17, fontWeight: "800", color: theme.textPrimary },
  meta: { fontSize: 12, color: theme.textMuted, marginTop: 4 },
  moreButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    backgroundColor: theme.surfaceElevated,
  },
  deletePressed: { opacity: 0.72 },
  deleteDisabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: spacing.lg, backgroundColor: theme.overlay },
  modalCard: { gap: spacing.md, borderRadius: radius.lg, backgroundColor: theme.surfaceElevated },
  importScroll: { flexGrow: 0, maxHeight: "90%" },
  shareToggle: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  modalTitle: { color: theme.textPrimary, fontSize: 23, fontWeight: "900" },
  modalDescription: { color: theme.textMuted, fontSize: 14, lineHeight: 21 },
  shareCodeInput: { minHeight: 52, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: theme.textPrimary, backgroundColor: theme.background, fontSize: 14 },
  modalActions: { flexDirection: "row", gap: spacing.sm },
  modalAction: { flex: 1 },
}); }
