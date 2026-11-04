import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import {
  ChineseMemoryOnly,
  MemoryLink,
  MemoryLoadState,
  useMemoryResource,
} from "@/components/memory/MemoryPrimitives";
import { themedCard } from "@/constants/design";
import { memoryOverview } from "@/db/hanzi-memory";
import { useTheme } from "@/theme/ThemeProvider";

export default function MemoryHub() {
  return (
    <ChineseMemoryOnly>
      <Hub />
    </ChineseMemoryOnly>
  );
}
function Hub() {
  const db = useSQLiteContext(),
    theme = useTheme();
  const [size, setSize] = useState(5);
  const resource = useMemoryResource(
    useCallback(() => memoryOverview(db), [db]),
    true,
  );
  const data = resource.data;
  const items: readonly [
    string,
    string,
    keyof typeof Ionicons.glyphMap,
    string,
  ][] = [
    [
      "Chữ hay quên",
      "Từ quên lặp lại và bài cứu hộ theo bằng chứng.",
      "bandage-outline",
      "/memory/words?mode=weak",
    ],
    [
      "Nhớ rồi viết",
      "Che chữ, tự viết rồi đối chiếu.",
      "brush-outline",
      "/memory/session?mode=writing",
    ],
    [
      "Phân biệt chữ",
      "Đối chiếu các phần khác nhau của chữ gần giống.",
      "git-compare-outline",
      "/memory/confusables",
    ],
    [
      "Ôn chữ cũ",
      "Bạn còn nhớ những từ đã học từ 30 ngày trước?",
      "time-outline",
      "/memory/words?mode=old",
    ],
    [
      "Học cấu tạo chữ",
      "Thành phần đã có nguồn và mẹo nhớ của bạn.",
      "grid-outline",
      "/memory/words?mode=structure",
    ],
  ];
  return (
    <Screen
      title="Củng cố trí nhớ"
      subtitle="Luyện nhớ chủ động ngoài phiên SRS. Lịch ôn và cấp nhớ giữ nguyên."
    >
      <MemoryLink label="Study Coach & quiz cá nhân" onPress={() => router.push('/ai/coach' as Href)} />
      <MemoryLoadState {...resource} />
      {data ? (
        <View style={[themedCard(theme), { gap: 8 }]}>
          <Text
            style={{
              color: theme.textPrimary,
              fontWeight: "800",
              fontSize: 18,
            }}
          >
            Gợi ý hôm nay
          </Text>
          <Text style={{ color: theme.textSecondary }}>
            {data.due} từ đến hạn · {data.weak} từ có lịch sử quên
          </Text>
          <Text style={{ color: theme.textPrimary }}>{data.plan.reason}</Text>
          <Text style={{ color: theme.textSecondary }}>
            Gợi ý {data.plan.reviewWords} từ ôn và {data.plan.newWords} từ mới ·
            ước tính {data.plan.estimatedMinutes} phút.
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {data.plan.assumptions} Mục tiêu đã chọn của bạn không tự đổi.
          </Text>
          <MemoryLink
            label="Mở ôn đến hạn"
            onPress={() => router.push("/review")}
          />
        </View>
      ) : null}
      <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
        Số từ trong phiên bổ trợ
      </Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Số từ trong phiên bổ trợ"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
      >
        {[5, 10, 15, 20].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: size === value }}
            onPress={() => setSize(value)}
            style={{
              minWidth: 52,
              minHeight: 48,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: size === value ? theme.primary : theme.border,
              backgroundColor:
                size === value ? theme.primarySoft : theme.surface,
            }}
          >
            <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <MemoryLink
        label="Luyện xen kẽ theo kỹ năng"
        onPress={() =>
          router.push(`/memory/session?mode=mixed&size=${size}` as Href)
        }
      />
      {items.map(([title, detail, icon, href]) => (
        <Pressable
          key={title}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${detail}`}
          onPress={() =>
            router.push(
              `${href}${href.includes("?") ? "&" : "?"}size=${size}` as Href,
            )
          }
          style={[
            themedCard(theme),
            {
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              minHeight: 80,
              padding: 16,
            },
          ]}
        >
          <Ionicons name={icon} size={26} color={theme.primaryText} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              {title}
            </Text>
            <Text style={{ color: theme.textMuted, lineHeight: 20 }}>
              {detail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}
