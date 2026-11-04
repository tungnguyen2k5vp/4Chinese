import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";
import { useAppStore } from "@/stores/app-store";
import { useTheme } from "@/theme/ThemeProvider";

export function AudioButton({ text, rate = 0.82, size = 26, allowWhenSoundDisabled = false, accessibilityLabel }: { text: string; rate?: number; size?: number; allowWhenSoundDisabled?: boolean; accessibilityLabel?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [slow, setSlow] = useState(false);
  const [wave] = useState(() => new Animated.Value(0));
  const request = useRef(0);
  const held = useRef(false);
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const theme = useTheme();
  const styles = createStyles(theme);
  const settings = useAppStore((state) => state.settings);
  const speechRate = settings?.speechRate ?? rate;
  const playbackAllowed = (settings?.soundEnabled ?? true) || allowWhenSoundDisabled;

  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(wave, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    const stop = () => { animation.stop(); wave.setValue(0); };
    stop();
    if (speaking && focused && !reduced && (AppState.currentState == null || AppState.currentState === 'active')) animation.start();
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => { subscription.remove(); stop(); };
  }, [focused, reduced, speaking, wave]);

  const speak = async (slowPlayback = false) => {
    if (!playbackAllowed) return;
    const token = ++request.current;
    const finish = () => { if (token === request.current) setSpeaking(false); };
    try {
      if (speaking && !slowPlayback) { await stopChineseSpeech(); finish(); return; }
      const result = await speakChinese(text, { rate: slowPlayback ? 0.6 : speechRate, onStart: () => { if (token === request.current) { setSlow(slowPlayback); setSpeaking(true); } }, onDone: finish, onStopped: finish, onError: finish });
      if (token !== request.current) return;
      if (!result.ok) finish();
      if (!result.ok && result.reason === "missing-mandarin-voice") {
        Alert.alert("Thiếu giọng đọc tiếng Trung", "Hãy mở Cài đặt Android → Văn bản thành giọng nói và tải giọng Tiếng Trung (Trung Quốc), sau đó mở lại app.");
      }
    } catch {
      if (token !== request.current) return;
      finish();
      Alert.alert("Không thể phát âm", "Bộ đọc văn bản của điện thoại đang gặp lỗi. Hãy kiểm tra âm lượng phương tiện và dịch vụ Văn bản thành giọng nói.");
    }
  };

  return <Pressable accessibilityLabel={accessibilityLabel ?? (speaking ? `Dừng phát âm ${text}` : `Nghe phát âm ${text} bằng giọng đọc máy`)} accessibilityRole="button" accessibilityState={{ disabled: !playbackAllowed, busy: speaking }}
    accessibilityHint="Chạm để nghe hoặc dừng; giữ để nghe chậm." accessibilityActions={[{ name: 'longpress', label: 'Nghe chậm' }]}
    onAccessibilityAction={({ nativeEvent }) => { if (nativeEvent.actionName === 'longpress') void speak(true); }}
    disabled={!playbackAllowed} hitSlop={8} onPressIn={() => { held.current = false; }} delayLongPress={400}
    onLongPress={event => { event.stopPropagation(); held.current = true; void speak(true); }}
    onPress={event => { event.stopPropagation(); if (!held.current) void speak(); }} style={({ pressed }) => [styles.button, !playbackAllowed && styles.disabled, pressed && styles.pressed]}>
    {speaking ? <View pointerEvents="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View testID="audio-playback-bars" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 22 }}>
        {/* ponytail: decorative playback indicator, not an acoustic waveform or pronunciation score. */}
        {[0, 1, 2].map(index => <Animated.View key={index} style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: theme.primaryText,
          transform: [{ scaleY: reduced ? 0.7 : wave.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: index === 1 ? [1, 0.45, 0.8, 0.4, 1] : index === 0 ? [0.4, 1, 0.5, 0.8, 0.4] : [0.65, 0.35, 1, 0.45, 0.65] }) }] }} />)}
      </View>
      <Ionicons name="stop" size={15} color={theme.primaryText} />
      {slow ? <Text testID="audio-slow-badge" style={{ position: 'absolute', bottom: -17, left: -3, right: -3, textAlign: 'center', fontSize: 10, fontWeight: '700', color: theme.primaryText, backgroundColor: theme.primarySoft, borderRadius: 8 }}>Chậm</Text> : null}
    </View> : <Ionicons name="volume-high" size={size} color={theme.primaryText} />}
  </Pressable>;
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 25, backgroundColor: theme.primarySoft },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.42 },
  });
}
