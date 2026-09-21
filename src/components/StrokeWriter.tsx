import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

import { colors, radius, spacing } from "@/constants/design";
import hsk12StrokeData from "@/data/hsk12-strokes.json";

const strokeMap = hsk12StrokeData as Record<string, string[]>;
const radicalReference: Record<string, string> = {
  "亻": "人", "忄": "心", "扌": "手", "灬": "火", "讠": "言",
  "钅": "金", "衤": "衣", "饣": "食", "刂": "刀", "纟": "糸",
  "礻": "示", "氵": "水",
};

export function StrokeWriter({ character, size = 260 }: { character: string; size?: number }) {
  const reference = radicalReference[character] ?? character;
  const strokes = useMemo(() => strokeMap[character] ?? strokeMap[reference] ?? [], [character, reference]);
  const [visible, setVisible] = useState(strokes.length);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return undefined;
    if (visible >= strokes.length) return undefined;
    const timer = setTimeout(() => setVisible((value) => value + 1), 420);
    return () => clearTimeout(timer);
  }, [playing, strokes.length, visible]);

  const replay = () => {
    setVisible(0);
    setPlaying(true);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.board, { width: size, height: size }]}>
        <Svg height="100%" viewBox="0 0 1024 1024" width="100%">
          <Line x1="512" x2="512" y1="44" y2="980" stroke="#D8DDEA" strokeDasharray="28 28" strokeWidth="5" />
          <Line x1="44" x2="980" y1="512" y2="512" stroke="#D8DDEA" strokeDasharray="28 28" strokeWidth="5" />
          {strokes.length ? (
            <G transform="translate(0 900) scale(1 -1)">
              {strokes.slice(0, visible).map((path, index) => (
                <Path
                  d={path}
                  fill={index === visible - 1 ? colors.primary : colors.text}
                  key={`${path.slice(0, 20)}-${index}`}
                />
              ))}
            </G>
          ) : (
            <SvgText fill="#2457D622" fontSize="650" textAnchor="middle" x="512" y="730">{character}</SvgText>
          )}
        </Svg>
      </View>
      {strokes.length ? (
        <>
          <View style={styles.controls}>
            <Pressable accessibilityLabel="Nét trước" onPress={() => setVisible((value) => Math.max(0, value - 1))} style={styles.control}><Text style={styles.controlText}>← Nét trước</Text></Pressable>
            <Pressable accessibilityLabel="Phát lại thứ tự nét" onPress={replay} style={styles.replay}><Text style={styles.replayText}>{playing && visible < strokes.length ? "Đang phát" : "▶ Phát lại"}</Text></Pressable>
            <Pressable accessibilityLabel="Nét sau" onPress={() => setVisible((value) => Math.min(strokes.length, value + 1))} style={styles.control}><Text style={styles.controlText}>Nét sau →</Text></Pressable>
          </View>
          <Text style={styles.caption}>Nét {visible}/{strokes.length}{reference !== character ? ` · dùng mẫu của ${reference}` : ""}</Text>
        </>
      ) : <Text style={styles.caption}>Quan sát hình gợi ý rồi tự viết ở ô bên dưới.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: spacing.md },
  board: { backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: "#D5A8A1", borderRadius: radius.md, overflow: "hidden" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs },
  control: { minHeight: 42, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
  controlText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  replay: { minHeight: 42, paddingHorizontal: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  replayText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  caption: { color: colors.textMuted, fontSize: 12, textAlign: "center" },
});
