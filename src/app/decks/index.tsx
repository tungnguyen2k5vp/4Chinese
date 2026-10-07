import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { radius, spacing, themedCard } from "@/constants/design";
import {
  createPersonalDeck,
  deletePersonalDeck,
  importSharedDeck,
  listDeletedPersonalDecks,
  listPersonalDecks,
} from "@/db/repository";
import { fetchSharedDeck, ShortDeckShareError } from "@/services/decks/short-share";
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { PersonalDeck } from "@/types/models";

export default function Decks() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const cardStyle = themedCard(theme);
  const [decks, setDecks] = useState<PersonalDeck[]>([]);
  const [deletedCount, setDeletedCount] = useState(0);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [friendCode, setFriendCode] = useState("");
  const [importingFriendDeck, setImportingFriendDeck] = useState(false);
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
    const id = await createPersonalDeck(db, name);
    setName("");
    setSaving(false);
    router.push(`/decks/${id}` as Href);
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
  const addFriendDeck = async () => {
    if (importingFriendDeck) return;
    setImportingFriendDeck(true);
    try {
      const payload = await fetchSharedDeck(friendCode);
      if (!payload) {
        Alert.alert("Mã không hợp lệ", "Nhập mã 8 ký tự mới hoặc dán mã HZD1 cũ mà bạn bè đã chia sẻ.");
        return;
      }
      const outcome = await importSharedDeck(db, payload);
      setFriendModalVisible(false);
      setFriendCode("");
      load();
      Alert.alert("Đã thêm bộ từ", `Đã nhập ${outcome.saved} từ trong “${payload.name}”.`, [
        { text: "Mở bộ từ", onPress: () => router.push(`/decks/${outcome.deckId}` as Href) },
        { text: "Đóng", style: "cancel" },
      ]);
    } catch (error) {
      const message = error instanceof ShortDeckShareError
        ? error.message
        : "Không thể kết nối máy chủ chia sẻ. Hãy thử lại.";
      Alert.alert("Chưa thể thêm bộ từ", message);
    } finally {
      setImportingFriendDeck(false);
    }
  };
  return (
    <Screen
      title="Bộ từ riêng"
      subtitle="Tự chọn từ cần học, sửa nghĩa theo ngữ cảnh của bạn và ôn bằng lịch cấp nhớ."
    >
      <View style={[cardStyle, styles.create]}>
        <Text style={styles.label}>TẠO BỘ TỪ MỚI</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ví dụ: Tiếng Trung công việc"
          placeholderTextColor={theme.textMuted}
          style={styles.input}
        />
        <PrimaryButton
          label="Tạo bộ từ"
          loading={saving}
          onPress={() => void create()}
        />
      </View>
      <PrimaryButton
        variant="ghost"
        icon="♻"
        label={deletedCount ? `Thùng rác (${deletedCount})` : "Thùng rác"}
        onPress={() => router.push("/decks/trash" as Href)}
      />
      <PrimaryButton
        variant="secondary"
        icon="👥"
        label="Thêm bộ từ của bạn bè"
        onPress={() => setFriendModalVisible(true)}
      />
      {decks.length ? (
        decks.map((deck) => (
          <View key={deck.id} style={[cardStyle, styles.deck]}>
            <Pressable
              style={styles.deckMain}
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
              accessibilityLabel={`Đưa bộ ${deck.name} vào thùng rác`}
              disabled={deletingId !== null}
              onPress={() => confirmArchive(deck)}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deletePressed,
                deletingId !== null && styles.deleteDisabled,
              ]}
            >
              {deletingId === deck.id ? (
                <ActivityIndicator color={theme.error} size="small" />
              ) : (
                <Ionicons name="trash-outline" size={19} color={theme.error} />
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
        visible={friendModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFriendModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[cardStyle, styles.modalCard]}>
            <Text style={styles.modalTitle}>Nhập mã bộ từ</Text>
            <Text style={styles.modalDescription}>
              Nhập mã 8 ký tự mới hoặc dán mã HZD1 cũ từ nút “Chia sẻ bộ từ”.
            </Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              multiline
              maxLength={1_000_000}
              value={friendCode}
              onChangeText={setFriendCode}
              placeholder="Ví dụ: K7M9X2QF hoặc HZD1.…"
              placeholderTextColor={theme.textMuted}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <PrimaryButton
                variant="secondary"
                label="Hủy"
                onPress={() => { setFriendModalVisible(false); setFriendCode(""); }}
                style={styles.modalAction}
              />
              <PrimaryButton
                label="Thêm bộ từ"
                loading={importingFriendDeck}
                disabled={!friendCode.trim()}
                onPress={() => void addFriendDeck()}
                style={styles.modalAction}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  create: { gap: spacing.md },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    color: theme.primaryText,
  },
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.errorSoft,
  },
  deletePressed: { opacity: 0.72 },
  deleteDisabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, justifyContent: "center", padding: spacing.lg, backgroundColor: theme.overlay },
  modalCard: { gap: spacing.md, borderRadius: radius.lg, backgroundColor: theme.surfaceElevated },
  modalTitle: { color: theme.textPrimary, fontSize: 23, fontWeight: "900" },
  modalDescription: { color: theme.textMuted, fontSize: 14, lineHeight: 21 },
  modalInput: { minHeight: 92, borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, padding: spacing.md, color: theme.textPrimary, backgroundColor: theme.background, fontSize: 14, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: spacing.sm },
  modalAction: { flex: 1 },
}); }
