import { useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Path, Polyline, Text as SvgText } from "react-native-svg";

import { radius, spacing } from "@/constants/design";
import { getStrokePaths } from '@/services/handwriting/stroke-data';
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

type Point = { x: number; y: number };
const PAPER_INK = "#172033";

export function WritingCanvas({ character, size = 300, onFirstStroke }: { character: string; size?: number; onFirstStroke?: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [lines, setLines] = useState<Point[][]>([]);
  const [hint, setHint] = useState(false);
  const [guided, setGuided] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const paths = useMemo(() => getStrokePaths(character), [character]);
  const [reportedStroke, setReportedStroke] = useState(false);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      setLines((value) => [...value, [point]]);
      if (!reportedStroke) { setReportedStroke(true); onFirstStroke?.(); }
    },
    onPanResponderMove: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      setLines((value) => {
        const last = value.at(-1) ?? [];
        const previous = last.at(-1);
        if (previous && Math.hypot(previous.x - point.x, previous.y - point.y) < 2.5) return value;
        return [...value.slice(0, -1), [...last, point]];
      });
    },
  }), [onFirstStroke, reportedStroke]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tự viết" accessibilityState={{ selected: !guided }} onPress={() => setGuided(false)} style={styles.button}><Text style={styles.text}>Tự viết</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Tô theo nét mẫu" accessibilityState={{ selected: guided, disabled: !paths.length }} disabled={!paths.length}
          onPress={() => setGuided(true)} style={[styles.button, !paths.length && styles.disabled]}><Text style={styles.text}>Tô theo nét</Text></Pressable>
      </View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Vùng giấy viết chữ ${character}`}
        accessibilityHint="Dùng ngón tay để viết chữ Hán trên vùng giấy này. Các nút bên dưới cho phép xóa nét hoặc bật gợi ý."
        style={[styles.canvas, { width: size, height: size }]}
        {...responder.panHandlers}
      >
        <Svg height={size} width={size}>
          <Line stroke={theme.border} strokeDasharray="5 5" x1={size / 2} x2={size / 2} y1="0" y2={size} />
          <Line stroke={theme.border} strokeDasharray="5 5" x1="0" x2={size} y1={size / 2} y2={size / 2} />
          {hint ? <SvgText fill={theme.primary} fillOpacity={0.12} fontSize={size * 0.65} textAnchor="middle" x={size / 2} y={size * 0.72}>{character}</SvgText> : null}
          {guided ? <G transform={`scale(${size / 1024}) translate(0 900) scale(1 -1)`}>
            {paths.map((path, index) => <Path key={index} d={path} fill={theme.primary} opacity={index === guideIndex ? 0.34 : 0.09} />)}
          </G> : null}
          {lines.map((line, index) => (
            <Polyline
              fill="none"
              key={index}
              points={line.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke={PAPER_INK}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
          ))}
        </Svg>
      </View>
      {guided ? <>
        <Text style={styles.tip}>Tô theo nét {guideIndex + 1}/{paths.length}, rồi tự chuyển nét. Mẫu tham khảo, không chấm đúng/sai.</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={guideIndex === 0} style={[styles.button, guideIndex === 0 && styles.disabled]}
            onPress={() => setGuideIndex((index) => Math.max(0, index - 1))}><Text style={styles.text}>Nét trước</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={guideIndex >= paths.length - 1} style={[styles.button, guideIndex >= paths.length - 1 && styles.disabled]}
            onPress={() => setGuideIndex((index) => Math.min(paths.length - 1, index + 1))}><Text style={styles.text}>Nét tiếp</Text></Pressable>
        </View>
      </> : !paths.length ? <Text style={styles.tip}>Chưa có mẫu nét chính xác ngoại tuyến. Bạn vẫn tự viết hoặc bật gợi ý hình.</Text> : null}
      <Text style={styles.tip}>Viết từng nét riêng để có thể tẩy nét vừa viết khi cần.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={!lines.length} onPress={() => setLines((value) => value.slice(0, -1))} style={[styles.button, !lines.length && styles.disabled]}>
          <Text style={styles.text}>Tẩy nét cuối</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => { setLines([]); setGuideIndex(0); }} style={styles.button}>
          <Text style={styles.text}>Xóa hết</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setHint((value) => !value)} style={styles.button}>
          <Text style={styles.text}>{hint ? "Ẩn gợi ý" : "Gợi ý hình"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrapper: { alignItems: "center", gap: spacing.sm },
    canvas: { backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, overflow: "hidden" },
    tip: { color: theme.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center" },
    actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
    button: { minWidth: 94, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: theme.primarySoft, paddingHorizontal: spacing.sm },
    disabled: { opacity: 0.45 },
    text: { color: theme.primaryText, fontSize: 12, fontWeight: "800" },
  });
}
