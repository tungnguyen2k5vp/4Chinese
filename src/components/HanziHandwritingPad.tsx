import { useCallback, useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { G, Line, Path, Polyline } from "react-native-svg";

import { radius, spacing } from "@/constants/design";
import {
  isChineseInkRecognitionAvailable,
  recognizeChineseInk,
  type InkPoint,
  type InkStroke,
} from "@/services/handwriting/recognizer";
import { combineCharacterCandidates } from "@/services/handwriting/segmentation";
import { getStrokePaths } from "@/services/handwriting/stroke-data";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

const size = 286;
const eraserRadius = 18;
const PAPER_INK = "#172033";

function touchesPoint(stroke: InkStroke, point: InkPoint): boolean {
  return stroke.points.some(
    (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= eraserRadius,
  );
}

export function HanziHandwritingPad({
  onSelect,
  onHintUsed,
  characterCount = 1,
  targetWord = "",
  resolveWordCandidates,
}: {
  onSelect: (hanzi: string) => void;
  onHintUsed?: () => void;
  /** Each required Hanzi gets its own retained writing page. */
  characterCount?: number;
  /** Used only to reveal one faint reference stroke at a time. */
  targetWord?: string;
  /** Filters ML candidates against the app dictionary before showing whole words. */
  resolveWordCandidates?: (characterCandidates: string[][]) => Promise<string[]>;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const recognitionAvailable = isChineseInkRecognitionAvailable();
  const pageCount = Math.max(1, Math.trunc(characterCount));
  const [currentPage, setCurrentPage] = useState(0);
  const [strokesByPage, setStrokesByPage] = useState<InkStroke[][]>(() =>
    Array.from({ length: pageCount }, () => []),
  );
  const [wordCandidates, setWordCandidates] = useState<string[]>([]);
  const [manualCandidate, setManualCandidate] = useState("");
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>(() =>
    Array.from({ length: pageCount }, () => ""),
  );
  const [fallbackByPage, setFallbackByPage] = useState<string[]>(() =>
    Array.from({ length: pageCount }, () => ""),
  );
  const [eraserMode, setEraserMode] = useState(false);
  const [hintCounts, setHintCounts] = useState<number[]>(() =>
    Array.from({ length: pageCount }, () => 0),
  );
  const [message, setMessage] = useState(
    recognitionAvailable
      ? "Viết một chữ trên mỗi trang rồi nhấn Nhận diện."
      : "Expo Go không chứa ML Kit. Bạn vẫn có thể nhập một Hán tự cho từng trang.",
  );
  const [busy, setBusy] = useState(false);

  const strokes = strokesByPage[currentPage] ?? [];
  const targetCharacters = Array.from(targetWord).slice(0, pageCount);
  const currentTarget = targetCharacters[currentPage] ?? "";
  const currentHintPaths = getStrokePaths(currentTarget);
  const currentHintCount = Math.min(hintCounts[currentPage] ?? 0, currentHintPaths.length);
  const selectedWord = selectedCharacters.join("");
  const allPagesReady = recognitionAvailable
    ? strokesByPage.every((page) => page.length > 0)
    : fallbackByPage.every((character) => Boolean(character));

  const updateCurrentStrokes = useCallback(
    (update: (items: InkStroke[]) => InkStroke[]) => {
      setStrokesByPage((pages) => {
        const next = Array.from({ length: pageCount }, (_, index) => pages[index] ?? []);
        next[currentPage] = update(next[currentPage] ?? []);
        return next;
      });
    },
    [currentPage, pageCount],
  );

  const eraseAt = useCallback(
    (point: InkPoint) => {
      if (selectedWord) {
        const empty = Array.from({ length: pageCount }, () => "");
        setSelectedCharacters(empty);
        onSelect("");
        setWordCandidates([]);
        setManualCandidate("");
      }
      updateCurrentStrokes((items) => {
        const next = items.filter((stroke) => !touchesPoint(stroke, point));
        return next.length === items.length ? items : next;
      });
    },
    [onSelect, pageCount, selectedWord, updateCurrentStrokes],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const nativeEvent = event.nativeEvent;
          if (!nativeEvent) return;
          const point = { x: nativeEvent.locationX, y: nativeEvent.locationY, t: nativeEvent.timestamp };
          if (eraserMode) {
            eraseAt(point);
            return;
          }
          if (selectedWord) {
            setSelectedCharacters(Array.from({ length: pageCount }, () => ""));
            onSelect("");
            setWordCandidates([]);
            setManualCandidate("");
          }
          updateCurrentStrokes((items) => [...items, { points: [point] }]);
        },
        onPanResponderMove: (event) => {
          const nativeEvent = event.nativeEvent;
          if (!nativeEvent) return;
          const point = { x: nativeEvent.locationX, y: nativeEvent.locationY, t: nativeEvent.timestamp };
          if (eraserMode) {
            eraseAt(point);
            return;
          }
          updateCurrentStrokes((items) => {
            const last = items.at(-1);
            if (!last) return items;
            const previous = last.points.at(-1);
            if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < 2.5) return items;
            return [...items.slice(0, -1), { points: [...last.points, point] }];
          });
        },
      }),
    [eraseAt, eraserMode, onSelect, pageCount, selectedWord, updateCurrentStrokes],
  );

  const emitSelection = (characters: string[]) => {
    onSelect(characters.join(""));
  };

  const selectWord = (value: string) => {
    const next = Array.from(value.trim()).slice(0, pageCount);
    if (next.length !== pageCount) return;
    setSelectedCharacters(next);
    setWordCandidates([]);
    setManualCandidate("");
    emitSelection(next);
    setMessage(`Đã chọn cả từ ${next.join("")}.`);
  };

  const recognize = async () => {
    if (!allPagesReady || busy) return;
    if (!recognitionAvailable) {
      const fallbackWord = fallbackByPage.join("");
      setSelectedCharacters([...fallbackByPage]);
      onSelect(fallbackWord);
      setMessage(`Đã xác nhận cả từ ${fallbackWord}.`);
      return;
    }
    setBusy(true);
    setEraserMode(false);
    setMessage("Đang nhận diện và ghép tất cả các mặt…");
    try {
      const results = await Promise.all(
        strokesByPage.map((page) => recognizeChineseInk(page, size, size)),
      );
      const characterCandidates = results.map((result) => result.candidates);
      const rawCandidates = combineCharacterCandidates(characterCandidates, 16);
      let dictionaryCandidates: string[] = [];
      let dictionaryLookupSucceeded = !resolveWordCandidates;
      if (resolveWordCandidates) {
        try {
          dictionaryCandidates = await resolveWordCandidates(characterCandidates);
          dictionaryLookupSucceeded = true;
        } catch {
          // Keep the raw ML candidates usable for custom words if the local
          // dictionary lookup itself fails.
        }
      }
      const candidates = (resolveWordCandidates && dictionaryLookupSucceeded
        ? dictionaryCandidates
        : rawCandidates).slice(0, 16);
      const fallbackCandidate = rawCandidates[0] ?? "";
      const useManualCandidate = Boolean(
        resolveWordCandidates &&
          dictionaryLookupSucceeded &&
          !dictionaryCandidates.length &&
          fallbackCandidate &&
          Array.from(fallbackCandidate).length === pageCount,
      );
      setWordCandidates(candidates);
      setManualCandidate(useManualCandidate ? fallbackCandidate : "");
      if (useManualCandidate) {
        const next = Array.from(fallbackCandidate);
        setSelectedCharacters(next);
        emitSelection(next);
      }
      setMessage(
        dictionaryCandidates.length
          ? "Đã lọc các từ có trong kho. Chọn từ đúng bên dưới."
          : resolveWordCandidates && dictionaryLookupSucceeded
            ? "Không có từ ghép tương ứng trong kho. Hãy viết lại hoặc thêm thủ công."
            : candidates.length
            ? "Kho chưa có từ ghép khớp hoàn toàn; bạn vẫn có thể chọn để thêm thủ công."
            : "Chưa nhận ra cả từ, hãy kiểm tra lại từng mặt.",
      );
    } catch {
      setWordCandidates([]);
      setManualCandidate("");
      setMessage("Nhận diện thất bại. Hãy kiểm tra mô hình ML Kit rồi thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const clearCurrentPage = () => {
    updateCurrentStrokes(() => []);
    setWordCandidates([]);
    setManualCandidate("");
    const next = Array.from({ length: pageCount }, () => "");
    setSelectedCharacters(next);
    setFallbackByPage((pages) => {
      const values = Array.from({ length: pageCount }, (_, index) => pages[index] ?? "");
      values[currentPage] = "";
      return values;
    });
    emitSelection(next);
    setMessage(`Đã xóa riêng trang ${currentPage + 1}.`);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= pageCount) return;
    setEraserMode(false);
    setCurrentPage(nextPage);
    setMessage(`Trang viết chữ ${nextPage + 1}/${pageCount}.`);
  };

  const revealNextStroke = () => {
    if (!currentHintPaths.length || currentHintCount >= currentHintPaths.length) return;
    const nextCount = currentHintCount + 1;
    setHintCounts((counts) => {
      const next = Array.from({ length: pageCount }, (_, index) => counts[index] ?? 0);
      next[currentPage] = nextCount;
      return next;
    });
    onHintUsed?.();
    setMessage(`Đã gợi ý nét ${nextCount}/${currentHintPaths.length} trên trang này.`);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.pageNavigation}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang viết trước"
          accessibilityState={{ disabled: currentPage === 0 }}
          disabled={currentPage === 0}
          onPress={() => goToPage(currentPage - 1)}
          style={[styles.pageArrow, currentPage === 0 && styles.pageArrowDisabled]}
        >
          <Text style={styles.pageArrowText}>‹</Text>
        </Pressable>
        <View style={styles.pageCopy}>
          <Text style={styles.pageTitle}>Chữ {currentPage + 1}/{pageCount}</Text>
          <Text style={styles.pageValue}>{selectedCharacters[currentPage] || "Chưa chọn"}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang viết tiếp theo"
          accessibilityState={{ disabled: currentPage === pageCount - 1 }}
          disabled={currentPage === pageCount - 1}
          onPress={() => goToPage(currentPage + 1)}
          style={[styles.pageArrow, currentPage === pageCount - 1 && styles.pageArrowDisabled]}
        >
          <Text style={styles.pageArrowText}>›</Text>
        </Pressable>
      </View>

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Vùng giấy viết chữ ${currentPage + 1} trên ${pageCount}`}
        accessibilityHint={eraserMode ? "Quét lên nét cần xóa." : "Dùng ngón tay để viết một chữ Hán trên vùng giấy này."}
        style={[styles.canvas, eraserMode && styles.canvasErasing]}
        {...responder.panHandlers}
      >
        <Svg width={size} height={size}>
          <Line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke={theme.border} strokeDasharray="5 5" />
          <Line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke={theme.border} strokeDasharray="5 5" />
          {currentHintCount ? (
            <G transform={`translate(0 ${900 * size / 1024}) scale(${size / 1024} ${-size / 1024})`}>
              {currentHintPaths.slice(0, currentHintCount).map((path, index) => (
                <Path
                  key={`${currentTarget}-${index}`}
                  d={path}
                  fill={theme.primary}
                  opacity={index === currentHintCount - 1 ? 0.2 : 0.1}
                />
              ))}
            </G>
          ) : null}
          {strokes.map((stroke, index) => (
            <Polyline
              key={index}
              points={stroke.points.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke={PAPER_INK}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.message}>{eraserMode ? "Chạm hoặc quét lên nét thừa để tẩy riêng nét đó." : message}</Text>

      {!recognitionAvailable ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackLabel}>NHẬP CHỮ {currentPage + 1} TRONG EXPO GO</Text>
          <TextInput
            accessibilityLabel={`Nhập chữ Hán cho trang ${currentPage + 1}`}
            value={fallbackByPage[currentPage] ?? ""}
            onChangeText={(value) => {
              const character = Array.from(value.trim().replace(/\s+/g, ""))[0] ?? "";
              setFallbackByPage((pages) => {
                const next = Array.from({ length: pageCount }, (_, index) => pages[index] ?? "");
                next[currentPage] = character;
                return next;
              });
              setSelectedCharacters(Array.from({ length: pageCount }, () => ""));
              setWordCandidates([]);
              setManualCandidate("");
              onSelect("");
            }}
            placeholder="例如: 学"
            placeholderTextColor={theme.textMuted}
            autoCorrect={false}
            style={styles.fallbackInput}
          />
        </View>
      ) : null}

      {wordCandidates.length ? (
        <View style={styles.candidates}>
          {wordCandidates.map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Chọn từ ${item}`}
              accessibilityState={{ selected: selectedWord === item }}
              key={item}
              style={[styles.candidate, styles.wordCandidate]}
              onPress={() => selectWord(item)}
            >
              <Text numberOfLines={1} style={styles.hanzi}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {!wordCandidates.length && manualCandidate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Chọn chữ ${manualCandidate} để nhập thông tin từ thủ công`}
          onPress={() => selectWord(manualCandidate)}
          style={styles.manualCandidate}
        >
          <Text style={styles.manualCandidateTitle}>Không có trong kho từ</Text>
          <Text style={styles.manualCandidateText}>
            Đã điền “{manualCandidate}”. Nhập pinyin và nghĩa để thêm thủ công
          </Text>
        </Pressable>
      ) : null}

      {currentHintPaths.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gợi ý nét tiếp theo cho chữ ${currentPage + 1}`}
          accessibilityState={{ disabled: currentHintCount >= currentHintPaths.length }}
          disabled={currentHintCount >= currentHintPaths.length}
          onPress={revealNextStroke}
          style={({ pressed }) => [
            styles.strokeHint,
            currentHintCount >= currentHintPaths.length && styles.strokeHintDisabled,
            pressed && styles.strokeHintPressed,
          ]}
        >
          <Text style={styles.strokeHintIcon}>✦</Text>
          <View style={styles.strokeHintCopy}>
            <Text style={styles.strokeHintTitle}>
              {currentHintCount >= currentHintPaths.length ? "Đã gợi ý hết các nét" : "Gợi ý một nét mờ"}
            </Text>
            <Text style={styles.strokeHintMeta}>Nét {currentHintCount}/{currentHintPaths.length} · chỉ áp dụng cho trang hiện tại</Text>
          </View>
        </Pressable>
      ) : targetWord ? (
        <Text style={styles.noStrokeHint}>Chữ này chưa có dữ liệu thứ tự nét ngoại tuyến.</Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={eraserMode ? "Tắt chế độ tẩy nét" : "Bật chế độ tẩy nét"}
          accessibilityState={{ selected: eraserMode }}
          style={[styles.action, eraserMode && styles.eraserActive]}
          onPress={() => setEraserMode((value) => !value)}
        >
          <Text style={[styles.actionText, eraserMode && styles.eraserActiveText]}>{eraserMode ? "Xong tẩy" : "Tẩy nét"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Xóa toàn bộ nét trên trang hiện tại" style={styles.action} onPress={clearCurrentPage}>
          <Text style={styles.actionText}>Xóa trang</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? "Đang nhận diện chữ" : recognitionAvailable ? "Nhận diện cả từ" : "Xác nhận cả từ"}
          accessibilityState={{ disabled: busy || !allPagesReady, busy }}
          style={[styles.action, styles.recognize]}
          disabled={busy || !allPagesReady}
          onPress={() => void recognize()}
        >
          <Text style={[styles.actionText, styles.recognizeText, !allPagesReady && styles.disabledText]}>
            {busy ? "Đang nhận diện…" : recognitionAvailable ? "Nhận diện cả từ" : "Xác nhận cả từ"}
          </Text>
        </Pressable>
      </View>

      <Text accessibilityLiveRegion="polite" style={styles.sequence}>
        {selectedCharacters.map((character) => character || "□").join("")} · {selectedCharacters.filter(Boolean).length}/{pageCount}
      </Text>
      {selectedWord.length === pageCount ? <Text accessibilityLiveRegion="polite" style={styles.complete}>Đã chọn đủ Hán tự.</Text> : null}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrapper: { alignItems: "center", gap: spacing.sm },
    pageNavigation: { width: size, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    pageArrow: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft },
    pageArrowDisabled: { opacity: 0.45 }, pageArrowText: { color: theme.primaryText, fontSize: 36, lineHeight: 38, fontWeight: "700" },
    pageCopy: { alignItems: "center" }, pageTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: "900" }, pageValue: { color: theme.primaryText, fontSize: 12, fontWeight: "700", marginTop: 2 },
    canvas: { width: size, height: size, backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, overflow: "hidden" },
    canvasErasing: { borderColor: theme.warning, borderWidth: 2.5 },
    message: { fontSize: 11, lineHeight: 16, color: theme.textMuted, textAlign: "center", minHeight: 30 },
    sequence: { fontSize: 20, color: theme.primaryText, fontWeight: "900", textAlign: "center", letterSpacing: 4 },
    complete: { color: theme.success, fontSize: 11, fontWeight: "800" },
    fallback: { width: size, gap: spacing.xs }, fallbackLabel: { fontSize: 10, color: theme.textMuted, fontWeight: "900", letterSpacing: 0.6, textAlign: "center" },
    fallbackInput: { minHeight: 48, borderWidth: 1, borderColor: theme.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: theme.textPrimary, backgroundColor: theme.surface, fontSize: 20, textAlign: "center" },
    candidates: { width: size, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
    candidate: { width: 50, height: 52, borderRadius: 12, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    wordCandidate: { width: "auto", minWidth: 74, paddingHorizontal: spacing.md },
    manualCandidate: { width: size, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: theme.warning, backgroundColor: theme.warningSoft, alignItems: "center", gap: 2 },
    manualCandidateTitle: { color: theme.warning, fontSize: 12, fontWeight: "900" },
    manualCandidateText: { color: theme.textSecondary, fontSize: 11, textAlign: "center" },
    hanzi: { width: "100%", paddingHorizontal: 2, fontSize: 25, lineHeight: 31, color: theme.primaryText, fontWeight: "800", textAlign: "center" },
    strokeHint: { width: size, minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: theme.info, backgroundColor: theme.infoSoft },
    strokeHintDisabled: { opacity: 0.6 },
    strokeHintPressed: { opacity: 0.72 },
    strokeHintIcon: { color: theme.primaryText, fontSize: 20, fontWeight: "900" },
    strokeHintCopy: { flex: 1 },
    strokeHintTitle: { color: theme.primaryText, fontSize: 13, fontWeight: "900" },
    strokeHintMeta: { color: theme.textSecondary, fontSize: 10, marginTop: 2 },
    noStrokeHint: { width: size, color: theme.textMuted, fontSize: 11, lineHeight: 16, textAlign: "center" },
    actions: { width: size, flexDirection: "row", gap: spacing.xs },
    action: { flex: 1, minHeight: 44, paddingHorizontal: spacing.xs, borderRadius: radius.md, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, justifyContent: "center", alignItems: "center" },
    recognize: { backgroundColor: theme.primary, borderColor: theme.primary }, actionText: { color: theme.textPrimary, fontSize: 12, fontWeight: "800" }, recognizeText: { color: theme.onPrimary }, disabledText: { opacity: 0.65 },
    eraserActive: { backgroundColor: theme.warningSoft, borderColor: theme.warning }, eraserActiveText: { color: theme.warning },
  });
}
