import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import {
  discardEnglishEditDraft,
  readEnglishCard,
  readEnglishEditDraft,
  saveEnglishEditDraft,
  updateEnglishCard,
  type EnglishEditDraft,
} from "@/db/english/card-editor";
import type { EnglishCard } from "@/db/english/learner";
import { replaceVisibleEnglishNotes, visibleEnglishNotes } from '@/services/english/reading-context';
import { useEnglishDatabase } from "@/services/languages/LanguageRuntime";
import { useLanguageProtection } from "@/services/languages/use-language-protection";
import { useTheme } from "@/theme/ThemeProvider";
import { getEnglishPalette } from "@/theme/english-tokens";

export default function EnglishCardEditor() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const db = useEnglishDatabase();
  const theme = useTheme();
  const isDark = theme.mode === "dark";
  const palette = getEnglishPalette(isDark);

  const [card, setCard] = useState<EnglishCard | null>(null);
  const [draft, setDraft] = useState<EnglishEditDraft | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [loadIssue, setLoadIssue] = useState<
    "missing-id" | "missing-card" | "load-failed" | null
  >(
    id ? null : "missing-id",
  );
  const [status, setStatus] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const screenLoading = Boolean(id) && loading;
  const visibleLoadIssue = id ? loadIssue : "missing-id";

  useLanguageProtection("DRAFT", dirty || busy);

  useEffect(() => {
    let live = true;
    if (!id) return;

    const epoch = generation;
    epoch.current++;
    void Promise.resolve()
      .then(() => {
        if (!live) return null;
        setLoading(true);
        setCard(null);
        setDraft(null);
        setError("");
        setLoadIssue(null);
        return Promise.all([
          readEnglishCard(db, id),
          readEnglishEditDraft(db, id),
        ]);
      })
      .then((result) => {
        if (!live || !result) return;
        const [row, saved] = result;
        if (!row) {
          setLoadIssue("missing-card");
          setError("");
          return;
        }
        setCard(row);
        setDraft(
          saved ?? {
            headword: row.headword,
            meaning_vi: row.meaning_vi,
            pos: row.pos,
            ipa: row.ipa,
            notes: row.notes,
            revision: row.revision,
          },
        );
        setDirty(!!saved);
        setConfirmDiscard(false);
        setError("");
        setLoadIssue(null);
        setStatus(saved ? "Đã khôi phục bản nháp chỉnh sửa ở máy." : "");
      })
      .catch(() => {
        if (live) {
          setLoadIssue("load-failed");
          setError(
            "Chưa mở được thẻ hoặc bản nháp. Không thay đổi dữ liệu; hãy thử lại.",
          );
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      epoch.current++;
    };
  }, [db, id, attempt]);

  const change = (
    field: keyof Omit<EnglishEditDraft, "revision">,
    text: string,
  ) => {
    if (!draft || lock.current) return;
    const next = { ...draft, [field]: field === 'notes' ? replaceVisibleEnglishNotes(draft.notes, text) : text };
    const token = ++generation.current;
    setDraft(next);
    setDirty(true);
    setStatus("Đang lưu bản nháp…");
    void saveEnglishEditDraft(db, id, next)
      .then(() => {
        if (token === generation.current)
          setStatus("Đã lưu bản nháp ở máy; chưa áp dụng vào thẻ.");
      })
      .catch(() => {
        if (token === generation.current)
          setStatus(
            "Chưa lưu được bản nháp. Giữ màn hình và thử lại lưu thay đổi.",
          );
      });
  };

  const save = async () => {
    if (!draft || lock.current || loading) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await updateEnglishCard(db, id, draft);
      generation.current++;
      setDirty(false);
      setDraft({
        ...draft,
        headword:
          card?.source_id === "USER" ? draft.headword.trim() : draft.headword,
        meaning_vi:
          card?.source_id === "USER"
            ? draft.meaning_vi.trim()
            : draft.meaning_vi,
        pos: card?.source_id === "USER" ? draft.pos.trim() : draft.pos,
        ipa: card?.source_id === "USER" ? draft.ipa.trim() : draft.ipa,
        revision: draft.revision + 1,
      });
      setStatus(
        "Đã lưu thay đổi. Lịch ôn, tiến độ và lịch sử được giữ nguyên.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message === "ENGLISH_EDIT_STALE"
          ? "Thẻ đã được cập nhật ở luồng khác. Bản nháp vẫn giữ; ghi lại nội dung rồi mở lại thẻ để so sánh, không ghi đè tự động."
          : "Chưa lưu được thay đổi. Nội dung bạn nhập vẫn giữ để thử lại.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const labels = {
    headword: "Từ hoặc cụm tiếng Anh",
    meaning_vi: "Nghĩa tiếng Việt",
    pos: "Từ loại (tùy chọn)",
    ipa: "Phiên âm IPA (tùy chọn)",
    notes: "Ghi chú cá nhân",
  };

  const limits = {
    headword: 300,
    meaning_vi: 2000,
    pos: 200,
    ipa: 300,
    notes: 10000,
  };

  return (
    <Screen
      title="Chỉnh sửa thẻ tiếng Anh"
      subtitle="Chỉnh sửa nội dung thẻ · Bảo toàn 100% tiến độ SRS"
      hideTitle
      avoidKeyboard
    >
      {/* Notice Card */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: isDark ? "#172338" : "#EFF6FF",
            borderColor: isDark ? "#25334D" : "#BFDBFE",
          },
        ]}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary} />
        <Text style={[styles.infoText, { color: palette.textSecondary }]}>
          Thay đổi từ hoặc nghĩa không đặt lại lịch ôn, không đổi ID thẻ và không làm mất tiến độ học tập.
        </Text>
      </View>

      {/* Loading */}
      {screenLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={[styles.loadingText, { color: palette.textSecondary }]}>
            Đang mở thông tin thẻ…
          </Text>
        </View>
      ) : null}

      {/* Error */}
      {error ? (
        <View style={[styles.alertCard, { backgroundColor: palette.errorLight, borderColor: palette.error }]}>
          <Ionicons name="alert-circle" size={18} color={palette.error} />
          <Text style={[styles.alertText, { color: palette.error }]}>{error}</Text>
        </View>
      ) : null}

      {visibleLoadIssue && !screenLoading ? (
        <View
          testID="english-card-editor-unavailable"
          style={[styles.alertCard, { backgroundColor: palette.surfaceSubtle, borderColor: palette.border }]}
        >
          <Ionicons name="information-circle-outline" size={18} color={palette.primary} />
          <Text style={[styles.alertText, { color: palette.textSecondary }]}>
            {visibleLoadIssue === "missing-id"
              ? "Đường dẫn chưa có mã thẻ. Không có dữ liệu nào bị thay đổi."
              : visibleLoadIssue === "missing-card"
                ? "Không tìm thấy thẻ này trong bộ từ hiện tại. Thẻ không bị thay đổi."
                : "Chưa tải được thẻ do lỗi tạm thời. Bản nháp và dữ liệu vẫn được giữ nguyên."}
          </Text>
        </View>
      ) : null}

      {!card && !screenLoading ? (
        <PrimaryButton
          label={visibleLoadIssue === "load-failed" ? "Thử tải lại" : "Quay về bộ từ"}
          onPress={() =>
            visibleLoadIssue === "load-failed"
              ? setAttempt((n) => n + 1)
              : router.replace("/english/decks" as Href)
          }
        />
      ) : null}

      {id && card && draft && !screenLoading ? (
        <View style={styles.formContainer}>
          {(Object.keys(labels) as (keyof typeof labels)[]).map((field) => (
            <View
              key={field}
              style={[
                styles.fieldCard,
                {
                  backgroundColor: isDark ? "#172338" : "#FFFFFF",
                  borderColor: isDark ? "#25334D" : "#E2E8F0",
                },
              ]}
            >
              <Text style={[styles.fieldLabel, { color: palette.textSecondary }]}>
                {labels[field]}
              </Text>
              <TextInput
                accessibilityLabel={`Sửa ${labels[field]}`}
                value={field === 'notes' ? visibleEnglishNotes(draft.notes) : draft[field]}
                onChangeText={(text) => change(field, text)}
                editable={
                  !busy && (card.source_id === "USER" || field === "notes")
                }
                maxLength={field === 'notes' ? Math.max(0, limits.notes - (draft.notes.length - visibleEnglishNotes(draft.notes).length)) : limits[field]}
                multiline={field === "meaning_vi" || field === "notes"}
                autoCapitalize="none"
                style={[
                  styles.fieldInput,
                  {
                    color: palette.textPrimary,
                    backgroundColor: isDark ? "#0B0F19" : "#F8FAFC",
                    borderColor: palette.border,
                    minHeight: field === "meaning_vi" || field === "notes" ? 70 : 44,
                  },
                ]}
              />
            </View>
          ))}

          {status ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.statusText, { color: palette.primary }]}
            >
              {status}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lưu thay đổi thẻ tiếng Anh"
            disabled={
              busy ||
              !dirty ||
              !draft.headword.trim() ||
              !draft.meaning_vi.trim()
            }
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.saveBtn,
              {
                backgroundColor:
                  !dirty || !draft.headword.trim() || !draft.meaning_vi.trim()
                    ? palette.surfaceSubtle
                    : palette.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text
                  style={[
                    styles.saveBtnText,
                    {
                      color:
                        !dirty || !draft.headword.trim() || !draft.meaning_vi.trim()
                          ? palette.textMuted
                          : "#FFFFFF",
                    },
                  ]}
                >
                  Lưu thay đổi thẻ
                </Text>
              </>
            )}
          </Pressable>

          {dirty ? (
            <View style={{ marginTop: 8 }}>
              {confirmDiscard ? (
                <View
                  style={[
                    styles.discardBox,
                    { backgroundColor: palette.errorLight, borderColor: palette.error },
                  ]}
                >
                  <Text style={[styles.discardText, { color: palette.error }]}>
                    Bỏ các thay đổi chưa lưu của thẻ này? Thẻ đã lưu và lịch ôn không bị thay đổi.
                  </Text>
                  <View style={styles.discardBtnRow}>
                    <Pressable
                      onPress={() => setConfirmDiscard(false)}
                      style={[styles.cancelDiscardBtn, { borderColor: palette.border }]}
                    >
                      <Text style={[styles.cancelDiscardText, { color: palette.textSecondary }]}>
                        Giữ lại
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Xác nhận bỏ bản nháp"
                      disabled={busy}
                      onPress={() => {
                        if (lock.current) return;
                        lock.current = true;
                        setBusy(true);
                        void discardEnglishEditDraft(db, id)
                          .then(() => {
                            generation.current++;
                            setDirty(false);
                            setAttempt((n) => n + 1);
                          })
                          .catch(() =>
                            setError(
                              "Chưa bỏ được bản nháp. Nội dung vẫn giữ; hãy thử lại.",
                            ),
                          )
                          .finally(() => {
                            lock.current = false;
                            setBusy(false);
                          });
                      }}
                      style={[styles.confirmDiscardBtn, { backgroundColor: palette.error }]}
                    >
                      <Text style={styles.confirmDiscardText}>Xác nhận bỏ</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ bản nháp chỉnh sửa"
                  disabled={busy}
                  onPress={() => setConfirmDiscard(true)}
                  style={[styles.discardToggleBtn, { borderColor: palette.border }]}
                >
                  <Text style={[styles.discardToggleText, { color: palette.error }]}>
                    Bỏ bản nháp & Đọc lại thẻ cũ
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <View style={{ height: 36 }} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
  },
  formContainer: {
    gap: 10,
  },
  fieldCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  fieldInput: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
    marginTop: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  discardToggleBtn: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  discardToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  discardBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  discardText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  discardBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelDiscardBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelDiscardText: {
    fontSize: 13,
    fontWeight: "600",
  },
  confirmDiscardBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmDiscardText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
