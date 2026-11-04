import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  ChineseMemoryOnly,
  ContrastGlyph,
  MemoryLink,
  useMemoryResource,
} from "@/components/memory/MemoryPrimitives";
import { themedCard } from "@/constants/design";
import { recordMemoryContrast } from "@/db/hanzi-memory";
import { findVocabularyByExactHanzi } from "@/db/repository";
import { stopChineseSpeech } from "@/services/audio/chinese-speech";
import {
  characterContrastGroups,
  type ContrastGroup,
} from "@/services/memory/character-content";
import { useTheme } from "@/theme/ThemeProvider";
export default function CharacterContrasts() {
  const { group } = useLocalSearchParams<{ group?: string }>();
  return (
    <ChineseMemoryOnly>
      <Contrasts key={group ?? "default"} />
    </ChineseMemoryOnly>
  );
}
function Contrasts() {
  const { group: groupId } = useLocalSearchParams<{ group?: string }>();
  const theme = useTheme();
  const [id, setId] = useState(groupId ?? characterContrastGroups[0]!.id);
  const group =
    characterContrastGroups.find((g) => g.id === id) ??
    characterContrastGroups[0]!;
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") void stopChineseSpeech();
    });
    return () => {
      sub.remove();
      void stopChineseSpeech();
    };
  }, []);
  return (
    <Screen
      title="Phân biệt chữ"
      subtitle="Nhóm đối chiếu do ứng dụng biên soạn, không có nghĩa là bạn đã nhầm các chữ này."
    >
      <View style={{ gap: 8, flexDirection: "row", flexWrap: "wrap" }}>
        {characterContrastGroups.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: group.id === item.id }}
            onPress={() => {
              void stopChineseSpeech();
              setId(item.id);
            }}
            style={{
              minHeight: 48,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: group.id === item.id ? theme.primary : theme.border,
              backgroundColor: theme.surface,
            }}
          >
            <Text style={{ color: theme.textPrimary, fontSize: 18 }}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <ContrastQuestion key={group.id} group={group} />
    </Screen>
  );
}
function ContrastQuestion({ group }: { group: ContrastGroup }) {
  const theme = useTheme(),
    db = useSQLiteContext();
  const [round, setRound] = useState(0),
    [selected, setSelected] = useState(""),
    [compared, setCompared] = useState(false),
    [hinted, setHinted] = useState(false),
    [result, setResult] = useState<boolean | null>(null),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [persisted, setPersisted] = useState(true);
  const busy = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const target = group.characters[round % group.characters.length]!;
  const examples = useMemoryResource(
    useCallback(async () => {
      const words = await findVocabularyByExactHanzi(
        db,
        group.characters.map((char) => char.hanzi),
      );
      return Object.fromEntries(
        group.characters.map((char) => [
          char.hanzi,
          words.find((word) => word.simplified === char.hanzi)?.examples[0] ??
            null,
        ]),
      );
    }, [db, group]),
  );
  const offset = (round + 1) % group.characters.length;
  const options = [
    ...group.characters.slice(offset),
    ...group.characters.slice(0, offset),
  ];
  const submit = async () => {
    if (!selected || busy.current || result !== null) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      const saved = await recordMemoryContrast(
        db,
        group.id,
        target.hanzi,
        selected,
        hinted,
      );
      if (live.current) {
        setPersisted(saved);
        setResult(selected === target.hanzi);
      }
    } catch {
      if (live.current)
        setError("Chưa lưu được lượt bổ trợ. Đáp án vẫn còn, hãy thử lại.");
    } finally {
      busy.current = false;
      if (live.current) setSaving(false);
    }
  };
  return (
    <>
      <View style={[themedCard(theme), { gap: 12 }]}>
        <Text style={{ color: theme.textMuted, fontWeight: "800" }}>
          CHỌN CHỮ PHÙ HỢP VỚI NGHĨA
        </Text>
        <Text
          style={{ color: theme.textPrimary, fontSize: 24, fontWeight: "800" }}
        >
          {target.meaning}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Chọn Hán tự"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}
        >
          {options.map((char) => (
            <Pressable
              key={char.hanzi}
              accessibilityRole="radio"
              accessibilityState={{
                checked: selected === char.hanzi,
                disabled: result !== null || saving,
              }}
              disabled={result !== null || saving}
              onPress={() => setSelected(char.hanzi)}
              style={{
                minHeight: 64,
                minWidth: 64,
                padding: 12,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderRadius: 14,
                borderColor:
                  selected === char.hanzi ? theme.primary : theme.border,
                backgroundColor:
                  selected === char.hanzi ? theme.primarySoft : theme.surface,
              }}
            >
              <Text style={{ color: theme.textPrimary, fontSize: 34 }}>
                {char.hanzi}
              </Text>
            </Pressable>
          ))}
        </View>
        {result === null ? (
          <>
            <MemoryLink
              label="Gợi ý bằng bảng đối chiếu"
              onPress={() => {
                setHinted(true);
                setCompared(true);
              }}
            />
            <PrimaryButton
              label={saving ? "Đang lưu…" : "Kiểm tra chữ đã chọn"}
              disabled={!selected || saving}
              onPress={() => void submit()}
            />
          </>
        ) : (
          <>
            <Text
              accessibilityLiveRegion="polite"
              style={{
                color: result ? theme.success : theme.error,
                fontWeight: "800",
              }}
            >
              {result
                ? hinted
                  ? "Đúng sau gợi ý"
                  : "Đúng không gợi ý"
                : `Cần chọn ${target.hanzi}; bạn đã chọn ${selected}.`}
            </Text>
            <Text style={{ color: theme.textSecondary }}>
              {target.contrast}
            </Text>
            <PinyinText value={target.pinyin} />
            <AudioButton text={target.hanzi} />
            {!persisted ? (
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Chữ này chưa có mục từ tương ứng trong kho; kết quả chỉ hiển thị
                trong lượt này.
              </Text>
            ) : null}
            <MemoryLink
              label="Viết lại chữ vừa đối chiếu"
              onPress={() =>
                router.push({
                  pathname: "/memory/session",
                  params: {
                    character: target.hanzi,
                    mode: "writing",
                    assisted: "1",
                  },
                } as Href)
              }
            />
            <PrimaryButton
              label="Câu tiếp theo"
              onPress={() => {
                setRound((value) => value + 1);
                setSelected("");
                setResult(null);
                setCompared(false);
                setHinted(true);
              }}
            />
          </>
        )}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: theme.error }}>
            {error}
          </Text>
        ) : null}
      </View>
      {compared || result !== null ? (
        <View style={{ gap: 12 }}>
          {group.characters.map((char) => (
            <View key={char.hanzi} style={[themedCard(theme), { gap: 10 }]}>
              <ContrastGlyph
                character={char.hanzi}
                highlight={char.highlightStrokes}
              />
              <Text
                style={{
                  color: theme.textPrimary,
                  fontWeight: "800",
                  fontSize: 22,
                }}
              >
                {char.hanzi} · {char.meaning}
              </Text>
              <PinyinText value={char.pinyin} />
              <AudioButton text={char.hanzi} />
              <Text style={{ color: theme.textSecondary }}>
                {char.contrast}
              </Text>
              {examples.data?.[char.hanzi] ? (
                <View style={{ gap: 6 }}>
                  <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                    Ví dụ trong kho từ hiện có
                  </Text>
                  <Text style={{ color: theme.textPrimary }}>
                    {examples.data[char.hanzi]!.chinese}
                  </Text>
                  <PinyinText value={examples.data[char.hanzi]!.pinyin} />
                  <Text style={{ color: theme.textSecondary }}>
                    {examples.data[char.hanzi]!.vietnamese}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  Chưa có ví dụ câu đã lưu cho chữ này.
                </Text>
              )}
              <MemoryLink
                label="Nguồn âm đọc và nghĩa"
                onPress={() => void Linking.openURL(char.sourceUrl)}
              />
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
