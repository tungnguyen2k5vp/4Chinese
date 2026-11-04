import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { AudioButton } from "./AudioButton";
import { HskBandSelect } from "./HskBandSelect";
import { PrimaryButton } from "./PrimaryButton";
import { Screen } from "./Screen";
import { SearchBar } from "./SearchBar";

import {
  getHsk30GrammarExamples,
  getHsk30Statistics,
  listHsk30Catalog,
  type Hsk30CatalogItem,
} from "@/db/hsk30";
import { useModalAnimationType } from "@/hooks/use-reduced-motion";
import {
  HSK30_KINDS,
  type Hsk30Kind,
  type SourceRow,
} from "@/services/hsk/hsk30-source";
import { useTheme } from "@/theme/ThemeProvider";
import type { HskBand } from "@/types/models";

type CategoryInfo = {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  color: "vocabulary" | "grammar" | "reading" | "speaking" | "hanzi";
  searchHint: string;
};
type CatalogGroup = { key: string; rows: Hsk30CatalogItem[] };

const categoryInfo: Record<Hsk30Kind, CategoryInfo> = {
  vocabulary: {
    label: "Từ vựng",
    icon: "book-outline",
    color: "vocabulary",
    searchHint: "Tìm từ, pinyin hoặc nghĩa tiếng Việt",
  },
  grammar: {
    label: "Ngữ pháp",
    icon: "git-branch-outline",
    color: "grammar",
    searchHint: "Tìm mẫu ngữ pháp hoặc ví dụ",
  },
  topic: {
    label: "Chủ đề",
    icon: "albums-outline",
    color: "reading",
    searchHint: "Tìm lĩnh vực hoặc nội dung chủ đề",
  },
  task: {
    label: "Giao tiếp",
    icon: "chatbubbles-outline",
    color: "speaking",
    searchHint: "Tìm kỹ năng hoặc tình huống giao tiếp",
  },
  hanzi: {
    label: "Hán tự",
    icon: "create-outline",
    color: "hanzi",
    searchHint: "Tìm chữ Hán",
  },
};

const grammarTypeNames: Record<string, string> = {
  语素: "Từ tố",
  词类: "Từ loại",
  短语: "Cụm từ",
  句子成分: "Thành phần câu",
  句子的类型: "Kiểu câu",
  动作的态: "Thể của hành động",
  特殊表达法: "Cách biểu đạt đặc biệt",
  固定格式: "Cấu trúc cố định",
  "语段（句群）": "Đoạn / nhóm câu",
};

const topicAreaNames: Record<string, string> = {
  基本信息: "Thông tin cơ bản",
  日常生活: "Đời sống hằng ngày",
  教育情况: "Giáo dục",
  职场生活: "Đời sống công việc",
  文化与传统: "Văn hóa & truyền thống",
  自然与环境: "Tự nhiên & môi trường",
  当代社会: "Xã hội hiện đại",
  科学技术: "Khoa học & công nghệ",
  个体与社会: "Cá nhân & xã hội",
  国家与社会: "Quốc gia & xã hội",
};

const chineseCategoryNames: Record<string, string> = {
  名: "Danh từ",
  名词: "Danh từ",
  动: "Động từ",
  动词: "Động từ",
  形: "Tính từ",
  形容词: "Tính từ",
  副: "Phó từ",
  副词: "Phó từ",
  代: "Đại từ",
  代词: "Đại từ",
  数: "Số từ",
  数词: "Số từ",
  量: "Lượng từ",
  量词: "Lượng từ",
  介: "Giới từ",
  介词: "Giới từ",
  连: "Liên từ",
  连词: "Liên từ",
  助: "Trợ từ",
  助词: "Trợ từ",
  叹: "Thán từ",
  叹词: "Thán từ",
  前缀: "Tiền tố",
  后缀: "Hậu tố",
  方位名词: "Danh từ chỉ phương vị",
};

const taskActions: [string, string][] = [
  ["问答", "Hỏi – đáp"],
  ["介绍", "Giới thiệu"],
  ["交流", "Trao đổi"],
  ["告知", "Thông báo"],
  ["描述", "Miêu tả"],
  ["讨论", "Thảo luận"],
  ["谈论", "Thảo luận"],
  ["讲述", "Kể chuyện"],
  ["日常言语交往", "Giao tiếp hằng ngày"],
];

function sourceTitle(row: SourceRow, kind: Hsk30Kind): string {
  if (kind === "vocabulary") return row.word ?? "";
  if (kind === "grammar") return row.pattern_zh || row.title_zh || "";
  if (kind === "hanzi") return row.character ?? "";
  if (kind === "task") return row.task_title_zh ?? "";
  return [row.topic_l1_zh, row.topic_l2_zh, row.topic_l3_zh]
    .filter(Boolean)
    .join(" · ");
}

function groupItems(
  items: Hsk30CatalogItem[],
  getKey: (row: SourceRow) => string | undefined,
  fallback: string,
): CatalogGroup[] {
  const groups = new Map<string, CatalogGroup>();
  for (const item of items) {
    const key = getKey(item.row)?.trim() || fallback;
    const group = groups.get(key) ?? { key, rows: [] };
    group.rows.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function localizeCategory(value: string): string {
  return value
    .split(/[、，,]/u)
    .map((part) => {
      const normalized = part.trim().replace(/^[（(]|[）)]$/gu, "").trim();
      return chineseCategoryNames[normalized] ?? normalized;
    })
    .filter(Boolean)
    .join(" · ");
}

function communicationAction(title: string): string {
  return (
    taskActions.find(([prefix]) => title.startsWith(prefix))?.[1] ??
    "Kỹ năng giao tiếp"
  );
}

function matchStatus(item: Hsk30CatalogItem): {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tone: "success" | "warning" | "muted";
} {
  if (item.status === "MATCHED")
    return { label: "Khớp kho từ", icon: "checkmark-circle", tone: "success" };
  if (item.status === "CONFLICT")
    return { label: "Cần đối chiếu", icon: "alert-circle", tone: "warning" };
  if (item.status === "MISSING")
    return {
      label: "Chưa có trong kho",
      icon: "add-circle-outline",
      tone: "muted",
    };
  return {
    label: "Chưa đối chiếu",
    icon: "help-circle-outline",
    tone: "muted",
  };
}

function CatalogMetric({
  kind,
  count,
  selected,
  onPress,
  theme,
}: {
  kind: Hsk30Kind;
  count: number | null;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const info = categoryInfo[kind];
  const accent = theme.skillColors[info.color];
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${info.label}, ${count ?? "đang tải"} mục`}
      onPress={onPress}
      style={{
        minWidth: 104,
        minHeight: 78,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? accent : theme.border,
        backgroundColor: selected ? theme.surfaceSelected : theme.surface,
        justifyContent: "space-between",
        gap: 7,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={info.icon} size={17} color={accent} />
        <Text
          numberOfLines={1}
          style={{ color: theme.textPrimary, fontSize: 12, fontWeight: "700" }}
        >
          {info.label}
        </Text>
      </View>
      <Text
        style={{
          color: selected ? accent : theme.textMuted,
          fontSize: 20,
          fontWeight: "800",
        }}
      >
        {count ?? "—"}
      </Text>
    </Pressable>
  );
}

function GroupHeading({
  icon,
  title,
  original,
  count,
  theme,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  original?: string;
  count: number;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingTop: 6,
        paddingBottom: 2,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: theme.primarySoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={theme.primaryText} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          style={{ color: theme.textPrimary, fontSize: 16, fontWeight: "800" }}
        >
          {title}
        </Text>
        {original && original !== title ? (
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {original}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          minWidth: 38,
          paddingHorizontal: 9,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: theme.surfaceSelected,
          alignItems: "center",
        }}
      >
        <Text
          style={{ color: theme.primaryText, fontWeight: "800", fontSize: 12 }}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

function CatalogCard({
  item,
  kind,
  onPress,
  theme,
}: {
  item: Hsk30CatalogItem;
  kind: Hsk30Kind;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const row = item.row;
  const title = sourceTitle(row, kind);
  const cardStyle = {
    borderRadius: 18,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  } as const;
  const label = `Xem ${title} · mục ${row.level_order}`;

  if (kind === "vocabulary") {
    const status = matchStatus(item);
    const tint =
      status.tone === "success"
        ? theme.success
        : status.tone === "warning"
          ? theme.warning
          : theme.textMuted;
    const statusSurface =
      status.tone === "success"
        ? theme.successSoft
        : status.tone === "warning"
          ? theme.warningSoft
          : theme.backgroundSecondary;
    return (
      <View
        style={[
          cardStyle,
          { padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [
            {
              flex: 1,
              minWidth: 0,
              padding: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            },
            pressed && { opacity: 0.82 },
          ]}
        >
          <View
            style={{
              width: 66,
              minHeight: 66,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primarySoft,
            }}
          >
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 30,
                fontWeight: "800",
              }}
            >
              {row.word}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text
              style={{
                color: theme.primaryText,
                fontSize: 17,
                fontWeight: "800",
              }}
            >
              {row.pinyin || "Chưa có pinyin"}
            </Text>
            <Text
              numberOfLines={2}
              style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 21 }}
            >
              {item.meaningVi || "Chưa có nghĩa tiếng Việt"}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 3,
              }}
            >
              {row.pos_zh ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {localizeCategory(row.pos_zh)}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: statusSurface,
                }}
              >
                <Ionicons name={status.icon} size={13} color={tint} />
                <Text style={{ color: tint, fontSize: 11, fontWeight: "700" }}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
        <View style={{ alignItems: "center", gap: 5 }}>
          <AudioButton
            text={row.word ?? ""}
            size={22}
            accessibilityLabel={`Nghe ${row.word}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chi tiết ${row.word}`}
            onPress={onPress}
            style={{
              minWidth: 40,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="chevron-forward"
              size={17}
              color={theme.textMuted}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  if (kind === "grammar") {
    const category = [row.category_zh, row.detail_zh]
      .filter(Boolean)
      .map((part) => localizeCategory(part!).replaceAll(" / ", " · "))
      .join(" · ");
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
          pressed && { opacity: 0.82 },
        ]}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: theme.primarySoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="git-branch-outline"
            size={21}
            color={theme.skillColors.grammar}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 18,
              lineHeight: 26,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
          {category ? (
            <Text
              style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}
            >
              {category}
            </Text>
          ) : null}
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 12,
              fontWeight: "700",
            }}
          >
            Mẫu ngữ pháp · chạm để xem ví dụ
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={theme.textMuted} />
      </Pressable>
    );
  }

  if (kind === "topic") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          {
            padding: 14,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          },
          pressed && { opacity: 0.82 },
        ]}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: theme.surfaceSelected,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: theme.primaryText,
              fontWeight: "800",
              fontSize: 12,
            }}
          >
            {String(row.level_order ?? "").padStart(2, "0")}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 13,
              fontWeight: "800",
            }}
          >
            {row.topic_l2_zh || "Nhóm chủ đề"}
          </Text>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 16,
              lineHeight: 23,
              fontWeight: "700",
            }}
          >
            {row.topic_l3_zh || title}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Nội dung trong nhóm chủ đề
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    );
  }

  if (kind === "task") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          { padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
          pressed && { opacity: 0.82 },
        ]}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: theme.surfaceSelected,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color={theme.skillColors.speaking}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 14,
              fontWeight: "800",
            }}
          >
            Mục tiêu {row.level_order}
          </Text>
          <Text
            numberOfLines={2}
            style={{ color: theme.textMuted, fontSize: 13, lineHeight: 18 }}
          >
            {row.task_description_zh || "Mở để xem mô tả nhiệm vụ."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    );
  }

  return null;
}

function TaskGroupCard({
  group,
  expanded,
  onToggle,
  onSelect,
  theme,
}: {
  group: CatalogGroup;
  expanded: boolean;
  onToggle: () => void;
  onSelect: (item: Hsk30CatalogItem) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const action = communicationAction(group.key);
  const actionIcon =
    action === "Hỏi – đáp"
      ? "help-buoy-outline"
      : action === "Giới thiệu"
        ? "person-circle-outline"
        : action === "Thông báo"
          ? "megaphone-outline"
          : "chatbubbles-outline";
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action}: ${group.key}, ${group.rows.length} mục tiêu`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [
          { padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
          pressed && { opacity: 0.82 },
        ]}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 15,
            backgroundColor: theme.surfaceSelected,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name={actionIcon}
            size={23}
            color={theme.skillColors.speaking}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text
            style={{
              color: theme.skillColors.speaking,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            {action.toUpperCase()}
          </Text>
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 17,
              fontWeight: "800",
            }}
          >
            {group.key}
          </Text>
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            {group.rows.length} mục tiêu giao tiếp
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={theme.primaryText}
        />
      </Pressable>
      {expanded ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>
          {group.rows.map((item) => (
            <CatalogCard
              key={item.sourceId}
              item={item}
              kind="task"
              onPress={() => onSelect(item)}
              theme={theme}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function Hsk30Catalog({
  initialBand = "1",
  initialSection = "vocabulary",
  reviewOnly = false,
}: {
  initialBand?: string;
  initialSection?: Hsk30Kind;
  reviewOnly?: boolean;
}) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const modalAnimation = useModalAnimationType();
  const [band, setBand] = useState<HskBand>(
    initialBand === "7-9"
      ? "7-9"
      : /^[1-6]$/u.test(initialBand)
        ? (Number(initialBand) as HskBand)
        : 1,
  );
  const [kind, setKind] = useState<Hsk30Kind>(initialSection);
  const [search, setSearch] = useState("");
  const [retry, setRetry] = useState(0);
  const [items, setItems] = useState<Hsk30CatalogItem[]>([]);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getHsk30Statistics>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [more, setMore] = useState(false);
  const [selected, setSelected] = useState<Hsk30CatalogItem | null>(null);
  const [examples, setExamples] = useState<SourceRow[]>([]);
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [exampleError, setExampleError] = useState(false);
  const [exampleRetry, setExampleRetry] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(),
  );
  const generation = useRef(0);
  const pageBusy = useRef(false);
  const pageSize = kind === "vocabulary" || kind === "hanzi" ? 100 : 200;

  useEffect(() => {
    const gen = ++generation.current;
    pageBusy.current = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      setSelected(null);
      setExpandedTasks(new Set());
      void Promise.all([
        listHsk30Catalog(
          db,
          kind,
          String(band),
          search,
          pageSize,
          0,
          reviewOnly,
        ),
        getHsk30Statistics(db),
      ])
        .then(([rows, counts]) => {
          if (gen === generation.current) {
            setItems(rows);
            setStats(counts);
            setMore(rows.length === pageSize);
          }
        })
        .catch(() => {
          if (gen === generation.current) {
            setItems([]);
            setError(true);
          }
        })
        .finally(() => {
          if (gen === generation.current) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      generation.current = gen + 1;
    };
  }, [db, kind, band, search, retry, reviewOnly, pageSize]);

  useEffect(() => {
    let live = true;
    if (!selected || kind !== "grammar")
      return () => {
        live = false;
      };
    void getHsk30GrammarExamples(db, selected.sourceId)
      .then((rows) => {
        if (live) setExamples(rows);
      })
      .catch(() => {
        if (live) setExampleError(true);
      })
      .finally(() => {
        if (live) setExamplesLoading(false);
      });
    return () => {
      live = false;
    };
  }, [db, kind, selected, exampleRetry]);

  const countFor = (value: Hsk30Kind) =>
    stats?.counts.find(
      (row) => row.kind === value && row.level === String(band),
    )?.count ?? 0;
  const cumulativeVocabulary =
    stats?.levels.find((row) => row.level === String(band))
      ?.cumulativeVocabulary ?? 0;
  const grammarGroups = useMemo(
    () => groupItems(items, (row) => row.grammar_type_zh, "Ngữ pháp khác"),
    [items],
  );
  const topicGroups = useMemo(
    () => groupItems(items, (row) => row.topic_l1_zh, "Chủ đề khác"),
    [items],
  );
  const taskGroups = useMemo(
    () => groupItems(items, (row) => row.task_title_zh, "Nhiệm vụ khác"),
    [items],
  );

  const loadMore = async () => {
    if (!more || loading || pageBusy.current) return;
    pageBusy.current = true;
    const gen = generation.current;
    try {
      const rows = await listHsk30Catalog(
        db,
        kind,
        String(band),
        search,
        pageSize,
        items.length,
        reviewOnly,
      );
      if (gen === generation.current) {
        setItems((current) => [...current, ...rows]);
        setMore(rows.length === pageSize);
      }
    } catch {
      if (gen === generation.current) setError(true);
    } finally {
      if (gen === generation.current) pageBusy.current = false;
    }
  };

  const openItem = (item: Hsk30CatalogItem) => {
    setSelected(item);
    setExamples([]);
    setExamplesLoading(kind === "grammar");
    setExampleError(false);
  };
  const info = categoryInfo[kind];
  const listHeader = (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <HskBandSelect
        value={band}
        allowAll={false}
        onChange={(value) => {
          if (value !== "all") setBand(value);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {HSK30_KINDS.map((value) => (
          <CatalogMetric
            key={value}
            kind={value}
            count={stats ? countFor(value) : null}
            selected={kind === value}
            theme={theme}
            onPress={() => {
              setKind(value);
              setSearch("");
            }}
          />
        ))}
      </ScrollView>
      {kind === "vocabulary" ? (
        <View
          style={{
            minHeight: 44,
            borderRadius: 14,
            backgroundColor: theme.infoSoft,
            paddingHorizontal: 12,
            paddingVertical: 9,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons name="layers-outline" size={18} color={theme.primaryText} />
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 13,
              fontWeight: "700",
              flex: 1,
            }}
          >
            {cumulativeVocabulary} từ tích lũy đến HSK {band}
          </Text>
        </View>
      ) : null}
      {reviewOnly && kind === "vocabulary" ? (
        <View
          style={{
            borderRadius: 14,
            backgroundColor: theme.warningSoft,
            paddingHorizontal: 12,
            paddingVertical: 9,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={theme.warning}
          />
          <Text
            style={{
              color: theme.warning,
              fontSize: 13,
              fontWeight: "700",
              flex: 1,
            }}
          >
            Chỉ hiển thị từ chưa ghép hoặc cần đối chiếu
          </Text>
        </View>
      ) : null}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={info.searchHint}
        accessibilityLabel={info.searchHint}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Ionicons
          name="information-circle-outline"
          size={17}
          color={theme.textMuted}
        />
        <Text
          style={{
            color: theme.textMuted,
            fontSize: 12,
            lineHeight: 17,
            flex: 1,
          }}
        >
          {kind === "vocabulary"
            ? "Danh mục gốc không kèm nghĩa Việt; nghĩa hiện ra khi khớp kho từ cá nhân."
            : "Nội dung giữ nguyên bản HSK 3.0 · 11/2025; các nhãn nhóm được giải thích bằng tiếng Việt."}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Đang tải danh mục"
          color={theme.primary}
        />
      ) : null}
      {error ? (
        <PrimaryButton
          label="Chưa tải được · thử lại"
          onPress={() => setRetry((value) => value + 1)}
        />
      ) : null}
    </View>
  );
  const listFooter = more ? (
    <PrimaryButton
      label="Xem thêm mục"
      variant="ghost"
      onPress={() => void loadMore()}
      style={{ marginTop: 8 }}
    />
  ) : null;
  const emptyState =
    !loading && !error ? (
      <View
        style={{
          padding: 24,
          borderRadius: 20,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          alignItems: "center",
          gap: 8,
        }}
      >
        <Ionicons name="search-outline" size={28} color={theme.textMuted} />
        <Text
          style={{
            color: theme.textPrimary,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Không tìm thấy mục phù hợp
        </Text>
        <Text
          style={{
            color: theme.textMuted,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          Thử từ khóa khác hoặc đổi cấp HSK.
        </Text>
      </View>
    ) : null;

  return (
    <Screen
      scroll={false}
      title={`${info.label} · HSK ${band}`}
      subtitle="Danh mục HSK 3.0 · 11/2025"
    >
      {kind === "topic" ? (
        <FlatList
          style={{ flex: 1 }}
          data={topicGroups}
          keyExtractor={(group) => group.key}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyState}
          contentContainerStyle={{ gap: 10, paddingBottom: 28 }}
          renderItem={({ item: group }) => (
            <View style={{ gap: 8 }}>
              <GroupHeading
                icon="compass-outline"
                title={topicAreaNames[group.key] ?? "Lĩnh vực chủ đề"}
                original={group.key}
                count={group.rows.length}
                theme={theme}
              />
              {group.rows.map((item) => (
                <CatalogCard
                  key={item.sourceId}
                  item={item}
                  kind="topic"
                  onPress={() => openItem(item)}
                  theme={theme}
                />
              ))}
            </View>
          )}
        />
      ) : kind === "grammar" ? (
        <FlatList
          style={{ flex: 1 }}
          data={grammarGroups}
          keyExtractor={(group) => group.key}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyState}
          contentContainerStyle={{ gap: 12, paddingBottom: 28 }}
          renderItem={({ item: group }) => (
            <View style={{ gap: 8 }}>
              <GroupHeading
                icon="git-branch-outline"
                title={grammarTypeNames[group.key] ?? "Nhóm ngữ pháp"}
                original={group.key}
                count={group.rows.length}
                theme={theme}
              />
              {group.rows.map((item) => (
                <CatalogCard
                  key={item.sourceId}
                  item={item}
                  kind="grammar"
                  onPress={() => openItem(item)}
                  theme={theme}
                />
              ))}
            </View>
          )}
        />
      ) : kind === "task" ? (
        <FlatList
          style={{ flex: 1 }}
          data={taskGroups}
          keyExtractor={(group) => group.key}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyState}
          contentContainerStyle={{ gap: 10, paddingBottom: 28 }}
          renderItem={({ item: group }) => (
            <TaskGroupCard
              group={group}
              expanded={expandedTasks.has(group.key)}
              onToggle={() =>
                setExpandedTasks((current) => {
                  const next = new Set(current);
                  if (next.has(group.key)) next.delete(group.key);
                  else next.add(group.key);
                  return next;
                })
              }
              onSelect={openItem}
              theme={theme}
            />
          )}
        />
      ) : kind === "hanzi" ? (
        <FlatList
          key={`hanzi-${band}`}
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(item) => item.sourceId}
          numColumns={4}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyState}
          contentContainerStyle={{ gap: 8, paddingBottom: 28 }}
          columnWrapperStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem ${item.row.character} · mục ${item.row.level_order}`}
              onPress={() => openItem(item)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 72,
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                },
                pressed && { opacity: 0.82 },
              ]}
            >
              <Text
                style={{
                  color: theme.textPrimary,
                  fontSize: 29,
                  fontWeight: "800",
                }}
              >
                {item.row.character}
              </Text>
              <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                #{item.row.level_order}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={items}
          keyExtractor={(item) => item.sourceId}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
          ListEmptyComponent={emptyState}
          contentContainerStyle={{ gap: 10, paddingBottom: 28 }}
          renderItem={({ item }) => (
            <CatalogCard
              item={item}
              kind="vocabulary"
              onPress={() => openItem(item)}
              theme={theme}
            />
          )}
        />
      )}

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType={modalAnimation}
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: theme.overlay,
          }}
        >
          <Pressable
            accessibilityLabel="Đóng chi tiết danh mục"
            onPress={() => setSelected(null)}
            style={{ flex: 1 }}
          />
          <View
            style={{
              maxHeight: "88%",
              backgroundColor: theme.surface,
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              borderTopWidth: 1,
              borderColor: theme.border,
              paddingTop: 10,
              paddingBottom: 24,
            }}
          >
            <View
              style={{
                height: 4,
                width: 42,
                borderRadius: 99,
                backgroundColor: theme.border,
                alignSelf: "center",
                marginBottom: 10,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 18,
                paddingBottom: 10,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name={info.icon}
                  size={19}
                  color={theme.primaryText}
                />
                <Text
                  style={{
                    color: theme.primaryText,
                    fontSize: 13,
                    fontWeight: "800",
                  }}
                >
                  {info.label} · HSK {band}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng chi tiết"
                onPress={() => setSelected(null)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={24} color={theme.textPrimary} />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 18,
                paddingBottom: 12,
                gap: 14,
              }}
            >
              {selected ? (
                <CatalogDetail
                  item={selected}
                  kind={kind}
                  examples={examples}
                  examplesLoading={examplesLoading}
                  exampleError={exampleError}
                  onRetryExamples={() => {
                    setExamples([]);
                    setExamplesLoading(true);
                    setExampleError(false);
                    setExampleRetry((value) => value + 1);
                  }}
                  theme={theme}
                />
              ) : null}
              <Text selectable style={{ color: theme.textMuted, fontSize: 11 }}>
                Mã tham chiếu: {selected?.sourceId}
              </Text>
              <PrimaryButton
                label="Đóng chi tiết"
                variant="ghost"
                onPress={() => setSelected(null)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function CatalogDetail({
  item,
  kind,
  examples,
  examplesLoading,
  exampleError,
  onRetryExamples,
  theme,
}: {
  item: Hsk30CatalogItem;
  kind: Hsk30Kind;
  examples: SourceRow[];
  examplesLoading: boolean;
  exampleError: boolean;
  onRetryExamples: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const row = item.row;
  if (kind === "vocabulary") {
    const status = matchStatus(item);
    const statusColor =
      status.tone === "success"
        ? theme.success
        : status.tone === "warning"
          ? theme.warning
          : theme.textMuted;
    return (
      <View style={{ gap: 14 }}>
        <View
          style={{
            borderRadius: 22,
            padding: 18,
            backgroundColor: theme.surfaceSelected,
            alignItems: "center",
            gap: 7,
          }}
        >
          <Text
            style={{
              color: theme.textPrimary,
              fontSize: 42,
              fontWeight: "800",
            }}
          >
            {row.word}
          </Text>
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 20,
              fontWeight: "800",
            }}
          >
            {row.pinyin}
          </Text>
          {row.pos_zh ? (
            <Text style={{ color: theme.textMuted }}>
              {localizeCategory(row.pos_zh)}
            </Text>
          ) : null}
          <AudioButton
            text={row.word ?? ""}
            accessibilityLabel={`Nghe phát âm ${row.word}`}
          />
        </View>
        <DetailInfo
          icon={status.icon}
          label={status.label}
          text={
            item.meaningVi ||
            "Nguồn HSK 3.0 không có nghĩa tiếng Việt cho mục này."
          }
          color={statusColor}
          theme={theme}
        />
        {item.vocabularyId ? (
          <PrimaryButton
            label="Mở từ trong kho cá nhân"
            onPress={() =>
              router.push({
                pathname: "/word/[id]",
                params: { id: item.vocabularyId!, hskSourceId: item.sourceId },
              } as Href)
            }
          />
        ) : null}
      </View>
    );
  }

  if (kind === "grammar") {
    const type = row.grammar_type_zh ?? "";
    const category = row.category_zh ?? "";
    return (
      <View style={{ gap: 14 }}>
        <View
          style={{
            borderRadius: 22,
            padding: 17,
            backgroundColor: theme.surfaceSelected,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: theme.primaryText,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            MẪU NGỮ PHÁP
          </Text>
          <Text
            selectable
            style={{
              color: theme.textPrimary,
              fontSize: 25,
              lineHeight: 34,
              fontWeight: "800",
            }}
          >
            {sourceTitle(row, kind)}
          </Text>
        </View>
        {type ? (
          <DetailInfo
            icon="git-branch-outline"
            label="Nhóm ngữ pháp"
            text={`${grammarTypeNames[type] ?? "Ngữ pháp"} · ${type}`}
            color={theme.skillColors.grammar}
            theme={theme}
          />
        ) : null}
        {category ? (
          <DetailInfo
            icon="pricetag-outline"
            label="Phân loại trong nguồn"
            text={localizeCategory(category)}
            color={theme.primaryText}
            theme={theme}
          />
        ) : null}
        {row.detail_zh ? (
          <DetailInfo
            icon="information-circle-outline"
            label="Ghi chú gốc"
            text={row.detail_zh}
            color={theme.textMuted}
            theme={theme}
          />
        ) : null}
        <Text
          style={{ color: theme.textMuted, fontSize: 13, fontWeight: "800" }}
        >
          VÍ DỤ TỪ DANH MỤC
        </Text>
        {examplesLoading ? <ActivityIndicator color={theme.primary} /> : null}
        {exampleError ? (
          <PrimaryButton
            label="Thử tải lại ví dụ"
            variant="ghost"
            onPress={onRetryExamples}
          />
        ) : null}
        {!examplesLoading && !exampleError && examples.length === 0 ? (
          <Text style={{ color: theme.textMuted }}>
            Nguồn chưa cung cấp ví dụ riêng cho mục này.
          </Text>
        ) : null}
        {examples.map((example) => (
          <ExampleCard
            key={example.example_index}
            text={example.example_zh ?? ""}
            theme={theme}
          />
        ))}
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Ví dụ trong nguồn là tiếng Trung, không kèm bản dịch tiếng Việt.
        </Text>
      </View>
    );
  }

  if (kind === "topic") {
    const steps = [
      {
        label: "Lĩnh vực",
        value: row.topic_l1_zh,
        display: topicAreaNames[row.topic_l1_zh ?? ""] ?? row.topic_l1_zh,
      },
      { label: "Nhóm chủ đề", value: row.topic_l2_zh },
      { label: "Nội dung", value: row.topic_l3_zh },
    ].filter((step) => step.value);
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          Cấu trúc chủ đề theo dữ liệu nguồn
        </Text>
        {steps.map((step, index) => (
          <View
            key={step.label}
            style={{ flexDirection: "row", alignItems: "stretch", gap: 10 }}
          >
            <View style={{ width: 30, alignItems: "center" }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: theme.onPrimary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  {index + 1}
                </Text>
              </View>
              {index < steps.length - 1 ? (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 20,
                    backgroundColor: theme.border,
                  }}
                />
              ) : null}
            </View>
            <View
              style={{
                flex: 1,
                marginBottom: 8,
                borderRadius: 16,
                padding: 14,
                gap: 4,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: theme.primaryText,
                  fontSize: 12,
                  fontWeight: "800",
                }}
              >
                {step.label.toUpperCase()}
              </Text>
              <Text
                selectable
                style={{
                  color: theme.textPrimary,
                  fontSize: 18,
                  lineHeight: 25,
                  fontWeight: "700",
                }}
              >
                {step.display}
              </Text>
              {step.display !== step.value ? (
                <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                  {step.value}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Tên và mô tả được giữ nguyên tiếng Trung theo danh mục HSK 3.0.
        </Text>
      </View>
    );
  }

  if (kind === "task") {
    const title = row.task_title_zh ?? "";
    return (
      <View style={{ gap: 14 }}>
        <View
          style={{
            borderRadius: 22,
            padding: 17,
            backgroundColor: theme.surfaceSelected,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: theme.skillColors.speaking,
              fontSize: 12,
              fontWeight: "800",
            }}
          >
            {communicationAction(title).toUpperCase()}
          </Text>
          <Text
            selectable
            style={{
              color: theme.textPrimary,
              fontSize: 24,
              lineHeight: 32,
              fontWeight: "800",
            }}
          >
            {title}
          </Text>
        </View>
        <DetailInfo
          icon="chatbubble-ellipses-outline"
          label={`Mục tiêu giao tiếp ${row.level_order ?? ""}`}
          text={row.task_description_zh ?? "Nguồn chưa có mô tả cho mục này."}
          color={theme.skillColors.speaking}
          theme={theme}
        />
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Mô tả gốc tiếng Trung · không có bản dịch tiếng Việt trong dữ liệu
          nguồn.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          borderRadius: 22,
          minHeight: 150,
          padding: 18,
          backgroundColor: theme.surfaceSelected,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text
          style={{ color: theme.textPrimary, fontSize: 68, fontWeight: "800" }}
        >
          {row.character}
        </Text>
        <Text style={{ color: theme.primaryText, fontWeight: "800" }}>
          Hán tự · HSK {item.level}
        </Text>
      </View>
      <DetailInfo
        icon="information-circle-outline"
        label="Dữ liệu nguồn"
        text="Mục Hán tự này không có pinyin hoặc nghĩa riêng trong danh mục 11/2025."
        color={theme.textMuted}
        theme={theme}
      />
    </View>
  );
}

function DetailInfo({
  icon,
  label,
  text,
  color,
  theme,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  text: string;
  color: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        borderRadius: 18,
        padding: 14,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <Ionicons name={icon} size={19} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={{ color, fontSize: 12, fontWeight: "800" }}>{label}</Text>
        <Text
          selectable
          style={{ color: theme.textPrimary, fontSize: 15, lineHeight: 22 }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}

function ExampleCard({
  text,
  theme,
}: {
  text: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        padding: 13,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
      }}
    >
      <Text
        selectable
        style={{
          flex: 1,
          color: theme.textPrimary,
          fontSize: 16,
          lineHeight: 24,
        }}
      >
        {text}
      </Text>
      <AudioButton
        text={text}
        size={19}
        accessibilityLabel={`Nghe ví dụ ${text}`}
      />
    </View>
  );
}
