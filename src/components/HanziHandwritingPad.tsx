import { useCallback, useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { G, Line, Path, Polyline } from "react-native-svg";

import { colors, radius, spacing } from "@/constants/design";
import hsk12StrokeData from "@/data/hsk12-strokes.json";
import {
  isChineseInkRecognitionAvailable,
  recognizeChineseInk,
  type InkPoint,
  type InkStroke,
} from "@/services/handwriting/recognizer";
import { combineCharacterCandidates } from "@/services/handwriting/segmentation";

const size = 286;
const eraserRadius = 18;
const strokeData = hsk12StrokeData as Record<string, string[]>;

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
}: {
  onSelect: (hanzi: string) => void;
  onHintUsed?: () => void;
  /** Each required Hanzi gets its own retained writing page. */
  characterCount?: number;
  /** Used only to reveal one faint reference stroke at a time. */
  targetWord?: string;
}) {
  const recognitionAvailable = isChineseInkRecognitionAvailable();
  const pageCount = Math.max(1, Math.trunc(characterCount));
  const [currentPage, setCurrentPage] = useState(0);
  const [strokesByPage, setStrokesByPage] = useState<InkStroke[][]>(() =>
    Array.from({ length: pageCount }, () => []),
  );
  const [wordCandidates, setWordCandidates] = useState<string[]>([]);
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
  const currentHintPaths = strokeData[currentTarget] ?? [];
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
      const candidates = combineCharacterCandidates(results.map((result) => result.candidates), 10);
      setWordCandidates(candidates);
      setMessage(candidates.length ? "Chọn đúng cả từ bên dưới." : "Chưa nhận ra cả từ, hãy kiểm tra lại từng mặt.");
    } catch {
      setWordCandidates([]);
      setMessage("Nhận diện thất bại. Hãy kiểm tra mô hình ML Kit rồi thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const clearCurrentPage = () => {
    updateCurrentStrokes(() => []);
    setWordCandidates([]);
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
          disabled={currentPage === pageCount - 1}
          onPress={() => goToPage(currentPage + 1)}
          style={[styles.pageArrow, currentPage === pageCount - 1 && styles.pageArrowDisabled]}
        >
          <Text style={styles.pageArrowText}>›</Text>
        </Pressable>
      </View>

      <View style={[styles.canvas, eraserMode && styles.canvasErasing]} {...responder.panHandlers}>
        <Svg width={size} height={size}>
          <Line x1={size / 2} y1="0" x2={size / 2} y2={size} stroke="#D8DDEA" strokeDasharray="5 5" />
          <Line x1="0" y1={size / 2} x2={size} y2={size / 2} stroke="#D8DDEA" strokeDasharray="5 5" />
          {currentHintCount ? (
            <G transform={`translate(0 ${900 * size / 1024}) scale(${size / 1024} ${-size / 1024})`}>
              {currentHintPaths.slice(0, currentHintCount).map((path, index) => (
                <Path
                  key={`${currentTarget}-${index}`}
                  d={path}
                  fill={colors.primary}
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
              stroke={colors.text}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
      <Text style={styles.message}>{eraserMode ? "Chạm hoặc quét lên nét thừa để tẩy riêng nét đó." : message}</Text>

      {!recognitionAvailable ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackLabel}>NHẬP CHỮ {currentPage + 1} TRONG EXPO GO</Text>
          <TextInput
            value={fallbackByPage[currentPage] ?? ""}
            onChangeText={(value) => {
              const character = Array.from(value.trim().replace(/\s+/g, ""))[0] ?? "";
              setFallbackByPage((pages) => {
                const next = Array.from({ length: pageCount }, (_, index) => pages[index] ?? "");
                next[currentPage] = character;
                return next;
              });
              setSelectedCharacters(Array.from({ length: pageCount }, () => ""));
              onSelect("");
            }}
            placeholder="例如: 学"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            style={styles.fallbackInput}
          />
        </View>
      ) : null}

      {wordCandidates.length ? (
        <View style={styles.candidates}>
          {wordCandidates.map((item) => (
            <Pressable key={item} style={[styles.candidate, styles.wordCandidate]} onPress={() => selectWord(item)}>
              <Text numberOfLines={1} style={styles.hanzi}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {currentHintPaths.length ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gợi ý nét tiếp theo cho chữ ${currentPage + 1}`}
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
          style={[styles.action, eraserMode && styles.eraserActive]}
          onPress={() => setEraserMode((value) => !value)}
        >
          <Text style={[styles.actionText, eraserMode && styles.eraserActiveText]}>{eraserMode ? "Xong tẩy" : "Tẩy nét"}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={clearCurrentPage}>
          <Text style={styles.actionText}>Xóa trang</Text>
        </Pressable>
        <Pressable style={[styles.action, styles.recognize]} disabled={busy || !allPagesReady} onPress={() => void recognize()}>
          <Text style={[styles.actionText, styles.recognizeText, !allPagesReady && styles.disabledText]}>
            {busy ? "Đang nhận diện…" : recognitionAvailable ? "Nhận diện cả từ" : "Xác nhận cả từ"}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sequence}>
        {selectedCharacters.map((character) => character || "□").join("")} · {selectedCharacters.filter(Boolean).length}/{pageCount}
      </Text>
      {selectedWord.length === pageCount ? <Text style={styles.complete}>Đã chọn đủ Hán tự.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: spacing.sm },
  pageNavigation: { width: size, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pageArrow: { width: 48, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  pageArrowDisabled: { opacity: 0.3 }, pageArrowText: { color: colors.primary, fontSize: 36, lineHeight: 38, fontWeight: "700" },
  pageCopy: { alignItems: "center" }, pageTitle: { color: colors.text, fontSize: 14, fontWeight: "900" }, pageValue: { color: colors.primary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  canvas: { width: size, height: size, backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: "#D5A8A1", borderRadius: radius.md, overflow: "hidden" },
  canvasErasing: { borderColor: colors.warning, borderWidth: 2.5 },
  message: { fontSize: 11, color: colors.textMuted, textAlign: "center", minHeight: 30 },
  sequence: { fontSize: 20, color: colors.primary, fontWeight: "900", textAlign: "center", letterSpacing: 4 },
  complete: { color: colors.success, fontSize: 11, fontWeight: "800" },
  fallback: { width: size, gap: spacing.xs }, fallbackLabel: { fontSize: 10, color: colors.textMuted, fontWeight: "900", letterSpacing: 0.6, textAlign: "center" },
  fallbackInput: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface, fontSize: 20, textAlign: "center" },
  candidates: { width: size, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  candidate: { width: 50, height: 52, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  wordCandidate: { width: "auto", minWidth: 74, paddingHorizontal: spacing.md },
  hanzi: { width: "100%", paddingHorizontal: 2, fontSize: 25, lineHeight: 31, color: colors.primary, fontWeight: "800", textAlign: "center" },
  strokeHint: { width: size, minHeight: 58, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: "#C9D6FA", backgroundColor: colors.primarySoft },
  strokeHintDisabled: { opacity: 0.6 },
  strokeHintPressed: { opacity: 0.72 },
  strokeHintIcon: { color: colors.primary, fontSize: 20, fontWeight: "900" },
  strokeHintCopy: { flex: 1 },
  strokeHintTitle: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  strokeHintMeta: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  noStrokeHint: { width: size, color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  actions: { width: size, flexDirection: "row", gap: spacing.xs },
  action: { flex: 1, minHeight: 44, paddingHorizontal: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center" },
  recognize: { backgroundColor: colors.primary, borderColor: colors.primary }, actionText: { color: colors.text, fontSize: 12, fontWeight: "800" }, recognizeText: { color: "#fff" }, disabledText: { opacity: 0.5 },
  eraserActive: { backgroundColor: "#FFF2DF", borderColor: colors.warning }, eraserActiveText: { color: colors.warning },
});
