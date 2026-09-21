import { useMemo, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Polyline, Text as SvgText } from "react-native-svg";

import { colors, radius, spacing } from "@/constants/design";

type Point = { x: number; y: number };

export function WritingCanvas({ character, size = 300 }: { character: string; size?: number }) {
  const [lines, setLines] = useState<Point[][]>([]);
  const [hint, setHint] = useState(false);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      setLines((value) => [...value, [point]]);
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
  }), []);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.canvas, { width: size, height: size }]} {...responder.panHandlers}>
        <Svg height={size} width={size}>
          <Line stroke="#D8DDEA" strokeDasharray="5 5" x1={size / 2} x2={size / 2} y1="0" y2={size} />
          <Line stroke="#D8DDEA" strokeDasharray="5 5" x1="0" x2={size} y1={size / 2} y2={size / 2} />
          {hint ? <SvgText fill="#2457D618" fontSize={size * 0.65} textAnchor="middle" x={size / 2} y={size * 0.72}>{character}</SvgText> : null}
          {lines.map((line, index) => (
            <Polyline
              fill="none"
              key={index}
              points={line.map((point) => `${point.x},${point.y}`).join(" ")}
              stroke={colors.text}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="7"
            />
          ))}
        </Svg>
      </View>
      <Text style={styles.tip}>Viết từng nét riêng để có thể tẩy nét vừa viết khi cần.</Text>
      <View style={styles.actions}>
        <Pressable disabled={!lines.length} onPress={() => setLines((value) => value.slice(0, -1))} style={[styles.button, !lines.length && styles.disabled]}>
          <Text style={styles.text}>Tẩy nét cuối</Text>
        </Pressable>
        <Pressable onPress={() => setLines([])} style={styles.button}>
          <Text style={styles.text}>Xóa hết</Text>
        </Pressable>
        <Pressable onPress={() => setHint((value) => !value)} style={styles.button}>
          <Text style={styles.text}>{hint ? "Ẩn gợi ý" : "Gợi ý hình"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: spacing.sm },
  canvas: { backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: "#D5A8A1", borderRadius: radius.md, overflow: "hidden" },
  tip: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  button: { minWidth: 94, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm },
  disabled: { opacity: 0.45 },
  text: { color: colors.primary, fontSize: 12, fontWeight: "800" },
});
