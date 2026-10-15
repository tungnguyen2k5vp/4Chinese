import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

import { radius, spacing } from "@/constants/design";
import { getStrokePaths } from "@/services/handwriting/stroke-data";
import { useTheme } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

const PAPER_INK = "#172033";

const radicalReference: Record<string, string> = {
  "亻": "人", "忄": "心", "扌": "手", "灬": "火", "讠": "言",
  "钅": "金", "衤": "衣", "饣": "食", "刂": "刀", "纟": "糸",
  "礻": "示", "氵": "水",
};

export function StrokeWriter({ character, size = 260 }: { character: string; size?: number }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(Math.max(1, windowWidth - 64));
  const boardSize = Math.max(1, Math.min(size, availableWidth));
  const reference = radicalReference[character] ?? character;
  const strokes = useMemo(() => {
    const exact = getStrokePaths(character);
    return exact.length ? exact : getStrokePaths(reference);
  }, [character, reference]);
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
    <View onLayout={(event) => setAvailableWidth(event.nativeEvent.layout.width)} style={styles.wrapper}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={strokes.length
          ? `Mẫu thứ tự nét của chữ ${reference}, đang hiện ${visible} trên ${strokes.length} nét.`
          : `Hình chữ ${character} từ phông chữ; chưa có dữ liệu thứ tự nét ngoại tuyến.`}
        style={[styles.board, { width: boardSize, height: boardSize }]}
      >
        <Svg height="100%" viewBox="0 0 1024 1024" width="100%">
          <Line x1="512" x2="512" y1="44" y2="980" stroke={theme.border} strokeDasharray="28 28" strokeWidth="5" />
          <Line x1="44" x2="980" y1="512" y2="512" stroke={theme.border} strokeDasharray="28 28" strokeWidth="5" />
          {strokes.length ? (
            <G transform="translate(0 900) scale(1 -1)">
              {strokes.slice(0, visible).map((path, index) => (
                <Path
                  d={path}
                  fill={index === visible - 1 ? theme.primary : PAPER_INK}
                  key={`${path.slice(0, 20)}-${index}`}
                />
              ))}
            </G>
          ) : (
            <SvgText fill={theme.primary} fillOpacity={0.14} fontSize="520" textAnchor="middle" x="512" y="700">{character}</SvgText>
          )}
        </Svg>
      </View>
      {strokes.length ? (
        <>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Nét trước" accessibilityState={{ disabled: visible === 0 }} disabled={visible === 0} onPress={() => setVisible((value) => Math.max(0, value - 1))} style={[styles.control, visible === 0 && styles.disabled]}><Text style={styles.controlText}>← Nét trước</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Phát lại thứ tự nét" onPress={replay} style={styles.replay}><Text style={styles.replayText}>{playing && visible < strokes.length ? "Đang phát" : "▶ Phát lại"}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Nét sau" accessibilityState={{ disabled: visible >= strokes.length }} disabled={visible >= strokes.length} onPress={() => setVisible((value) => Math.min(strokes.length, value + 1))} style={[styles.control, visible >= strokes.length && styles.disabled]}><Text style={styles.controlText}>Nét sau →</Text></Pressable>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.caption}>Nét {visible}/{strokes.length}{reference !== character ? ` · dùng mẫu của ${reference}` : ""}</Text>
        </>
      ) : <Text accessibilityLiveRegion="polite" style={styles.caption}>
        Chưa có dữ liệu thứ tự nét ngoại tuyến cho chữ {character}. Hình trên chỉ là chữ từ phông chữ, không hướng dẫn thứ tự nét. Bạn vẫn có thể tự viết ở ô bên dưới; app không thay bằng nét của chữ khác.
      </Text>}
    </View>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    wrapper: { alignItems: "center", alignSelf: "stretch", gap: spacing.md },
    board: { backgroundColor: "#FFFDFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: radius.md, overflow: "hidden" },
    controls: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: spacing.xs },
    control: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
    controlText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
    disabled: { opacity: 0.55 },
    replay: { minHeight: 44, paddingHorizontal: spacing.md, backgroundColor: theme.primarySoft, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    replayText: { color: theme.primaryText, fontSize: 13, fontWeight: "900" },
    caption: { color: theme.textMuted, fontSize: 12, textAlign: "center" },
  });
}
