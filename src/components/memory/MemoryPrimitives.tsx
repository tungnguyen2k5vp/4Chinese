import { router, useFocusEffect, type Href } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PrimaryButton } from "@/components/PrimaryButton";
import { stopChineseSpeech } from "@/services/audio/chinese-speech";
import { getStrokePaths } from "@/services/handwriting/stroke-data";
import { useLearningLanguage } from "@/services/languages/LanguageProvider";
import { useTheme } from "@/theme/ThemeProvider";

export function ChineseMemoryOnly({ children }: PropsWithChildren) {
  const { preferences } = useLearningLanguage();
  const theme = useTheme();
  useFocusEffect(
    useCallback(
      () => () => {
        void stopChineseSpeech();
      },
      [],
    ),
  );
  if (preferences.learningLanguage === "en")
    return (
      <Screen title="Củng cố Hán tự">
        <Text style={{ color: theme.textPrimary }}>
          Khu vực này dành cho tiếng Trung.
        </Text>
        <PrimaryButton
          label="Về trang chủ"
          onPress={() => router.replace("/(tabs)" as Href)}
        />
      </Screen>
    );
  return <>{children}</>;
}
export function useMemoryResource<T>(
  load: () => Promise<T>,
  refreshOnFocus = false,
) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current && refreshOnFocus) {
        setState((previous) => ({ ...previous, loading: true, error: "" }));
        setRevision((value) => value + 1);
      }
      focusedBefore.current = true;
    }, [refreshOnFocus]),
  );
  useEffect(() => {
    let live = true;
    void load()
      .then((data) => {
        if (live) setState({ data, error: "", loading: false });
      })
      .catch(() => {
        if (live)
          setState({
            data: null,
            error: "Chưa đọc được dữ liệu học. Bạn có thể thử lại.",
            loading: false,
          });
      });
    return () => {
      live = false;
    };
  }, [load, revision]);
  return {
    ...state,
    retry: () => {
      setState({ data: null, error: "", loading: true });
      setRevision((value) => value + 1);
    },
  };
}
export function MemoryLoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      {loading ? (
        <View style={{ gap: 8 }}>
          <ActivityIndicator color={theme.primaryText} />
          <Text style={{ color: theme.textMuted }}>Đang đọc dữ liệu học…</Text>
        </View>
      ) : null}
      {error ? (
        <View accessibilityRole="alert" style={{ gap: 8 }}>
          <Text style={{ color: theme.error }}>{error}</Text>
          <PrimaryButton variant="secondary" label="Thử lại" onPress={retry} />
        </View>
      ) : null}
    </>
  );
}
export function MemoryLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 48, justifyContent: "center", paddingVertical: 8 }}
    >
      <Text style={{ color: theme.primaryText, fontWeight: "800" }}>
        {label} →
      </Text>
    </Pressable>
  );
}
export function ContrastGlyph({
  character,
  highlight = [],
}: {
  character: string;
  highlight?: number[];
}) {
  const theme = useTheme();
  const paths = getStrokePaths(character);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Chữ ${character}. Các nét màu nhấn là vùng cần đối chiếu.`}
      style={{
        width: "100%",
        maxWidth: 150,
        aspectRatio: 1,
        alignSelf: "center",
        backgroundColor: "#FFFDFC",
        borderRadius: 16,
      }}
    >
      {paths.length ? (
        <Svg width="100%" height="100%" viewBox="0 0 1024 1024">
          <G transform="translate(0 900) scale(1 -1)">
            {paths.map((d, index) => (
              <Path
                key={index}
                d={d}
                fill={highlight.includes(index) ? theme.primary : "#172033"}
              />
            ))}
          </G>
        </Svg>
      ) : (
        <Text
          style={{
            fontSize: 72,
            color: theme.textPrimary,
            textAlign: "center",
          }}
        >
          {character}
        </Text>
      )}
    </View>
  );
}
