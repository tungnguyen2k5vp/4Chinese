import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

import { radius, spacing } from "@/constants/design";
import { useReducedMotion } from '@/hooks/use-reduced-motion';
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
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: windowWidth } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(Math.max(1, windowWidth - 64));
  const boardSize = Math.max(1, Math.min(size, availableWidth));
  const reference = radicalReference[character] ?? character;
  const strokes = useMemo(() => {
    const exact = getStrokePaths(character);
    return exact.length ? exact : getStrokePaths(reference);
  }, [character, reference]);
  const [showGuide, setShowGuide] = useState(true);
  const [sequence, setSequence] = useState({ character, reducedMotion, focused, visible: strokes.length, playing: false, speed: 1, revision: 0 });
  const { visible, playing, speed, revision } = sequence;

  if (sequence.character !== character || sequence.reducedMotion !== reducedMotion || sequence.focused !== focused) {
    setSequence({ character, reducedMotion, focused, visible: sequence.character !== character || reducedMotion ? strokes.length : visible, playing: false, speed, revision: revision + 1 });
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') setSequence(current => ({ ...current, playing: false, revision: current.revision + 1 }));
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!playing || reducedMotion || !focused) return undefined;
    if (visible >= strokes.length) return undefined;
    // ponytail: reveal whole outline strokes; add pen travel only when trusted medians are available.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      setSequence(current => {
        if (current.revision !== revision) return current;
        const next = Math.min(strokes.length, current.visible + 1);
        return { ...current, visible: next, playing: next < strokes.length };
      });
    }, 420 / speed);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [character, focused, playing, reducedMotion, revision, speed, strokes.length, visible]);

  const replay = () => {
    const canPlay = !reducedMotion && focused && (AppState.currentState == null || AppState.currentState === 'active');
    setSequence(current => ({ ...current, visible: canPlay ? 0 : strokes.length, playing: canPlay, revision: current.revision + 1 }));
  };
  const move = (delta: number) => {
    setSequence(current => ({ ...current, visible: Math.max(0, Math.min(strokes.length, current.visible + delta)), playing: false, revision: current.revision + 1 }));
  };
  const togglePlayback = () => {
    setSequence(current => ({ ...current, playing: !current.playing && !reducedMotion && focused && (AppState.currentState == null || AppState.currentState === 'active') && current.visible < strokes.length, revision: current.revision + 1 }));
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
              {strokes.map((path, index) => (
                <Path
                  d={path}
                  fill={index === visible - 1 ? theme.primary : PAPER_INK}
                  opacity={index < visible ? 1 : showGuide ? 0.12 : 0}
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
            <Text style={styles.controlText}>Tốc độ</Text>
            {[0.5, 1, 1.5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Tốc độ nét viết ${value} lần`}
              accessibilityState={{ selected: speed === value }} aria-pressed={speed === value}
              onPress={() => setSequence(current => ({ ...current, speed: value, revision: current.revision + 1 }))}
              style={[styles.control, speed === value && styles.replay]}><Text style={styles.controlText}>{value}×</Text></Pressable>)}
            <Pressable accessibilityRole="switch" accessibilityLabel="Hiện nét mờ gợi ý" accessibilityState={{ checked: showGuide }} aria-checked={showGuide}
              onPress={() => setShowGuide(value => !value)} style={styles.control}><Text style={styles.controlText}>{showGuide ? 'Ẩn nét mờ' : 'Hiện nét mờ'}</Text></Pressable>
          </View>
          <Text style={styles.caption}>Chạm từng nét để xem lại</Text>
          <ScrollView horizontal style={{ alignSelf: 'stretch', flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}>
            {strokes.map((path, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Xem nét ${index + 1} của chữ ${reference}`}
              accessibilityState={{ selected: visible === index + 1 }} aria-pressed={visible === index + 1} onPress={() => move(index + 1 - visible)}
              style={({ pressed }) => [styles.strokeChip, visible === index + 1 && { borderColor: theme.primary, backgroundColor: theme.primarySoft }, pressed && { opacity: 0.65 }]}>
              <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <Svg width={28} height={28} viewBox="0 0 1024 1024"><G transform="translate(0 900) scale(1 -1)"><Path d={path} fill={theme.primaryText} /></G></Svg>
              </View>
              <Text style={styles.controlText}>{index + 1}</Text>
            </Pressable>)}
          </ScrollView>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Nét trước" accessibilityState={{ disabled: visible === 0 }} disabled={visible === 0} onPress={() => move(-1)} style={[styles.control, visible === 0 && styles.disabled]}><Text style={styles.controlText}>← Nét trước</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Tạm dừng thứ tự nét' : 'Tiếp tục thứ tự nét'} accessibilityState={{ disabled: reducedMotion || visible >= strokes.length || !focused }} disabled={reducedMotion || visible >= strokes.length || !focused} onPress={togglePlayback} style={[styles.replay, (reducedMotion || visible >= strokes.length || !focused) && styles.disabled]}><Text style={styles.replayText}>{playing ? 'Ⅱ Tạm dừng' : '▶ Tiếp tục'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Nét sau" accessibilityState={{ disabled: visible >= strokes.length }} disabled={visible >= strokes.length} onPress={() => move(1)} style={[styles.control, visible >= strokes.length && styles.disabled]}><Text style={styles.controlText}>Nét sau →</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Phát lại thứ tự nét" onPress={replay} style={styles.control}><Text style={styles.controlText}>↻ Phát lại</Text></Pressable>
          </View>
          <Text testID="stroke-position" accessibilityLiveRegion={playing ? 'none' : 'polite'} style={styles.caption}>{playing ? 'Đang phát · ' : visible === strokes.length ? 'Đã hiện đủ nét mẫu · ' : 'Đã dừng · '}Nét {visible}/{strokes.length}{reference !== character ? ` · dùng mẫu của ${reference}` : ""}</Text>
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
    strokeChip: { minWidth: 48, minHeight: 64, padding: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: radius.md },
    control: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: "center", justifyContent: "center" },
    controlText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
    disabled: { opacity: 0.55 },
    replay: { minHeight: 44, paddingHorizontal: spacing.md, backgroundColor: theme.primarySoft, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
    replayText: { color: theme.primaryText, fontSize: 13, fontWeight: "900" },
    caption: { color: theme.textMuted, fontSize: 12, textAlign: "center" },
  });
}
