import { router, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import {
  HSK30_KINDS,
  type Hsk30Kind,
  type SourceRow,
} from "@/services/hsk/hsk30-source";
import { useTheme } from "@/theme/ThemeProvider";
import type { HskBand } from "@/types/models";

const labels: Record<Hsk30Kind, string> = {
  vocabulary: "Từ vựng",
  grammar: "Ngữ pháp",
  topic: "Chủ đề",
  task: "Giao tiếp",
  hanzi: "Hán tự",
};
function title(row: SourceRow, kind: Hsk30Kind): string {
  return (
    (kind === "vocabulary"
      ? row.word
      : kind === "grammar"
        ? row.title_zh
        : kind === "hanzi"
          ? row.character
          : kind === "task"
            ? row.task_title_zh
            : [row.topic_l1_zh, row.topic_l2_zh, row.topic_l3_zh]
                .filter(Boolean)
                .join(" · ")) ?? ""
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
  const db = useSQLiteContext(),
    theme = useTheme();
  const [band, setBand] = useState<HskBand>(
    initialBand === "7-9"
      ? "7-9"
      : /^[1-6]$/u.test(initialBand)
        ? (Number(initialBand) as HskBand)
        : 1,
  );
  const [kind, setKind] = useState<Hsk30Kind>(initialSection);
  const [search, setSearch] = useState(""),
    [retry, setRetry] = useState(0);
  const [items, setItems] = useState<Hsk30CatalogItem[]>([]);
  const [stats, setStats] = useState<Awaited<
    ReturnType<typeof getHsk30Statistics>
  > | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false),
    [more, setMore] = useState(false);
  const [selected, setSelected] = useState<Hsk30CatalogItem | null>(null);
  const [examples, setExamples] = useState<SourceRow[]>([]),
    [exampleError, setExampleError] = useState(false);
  const generation = useRef(0),
    pageBusy = useRef(false);
  useEffect(() => {
    const gen = ++generation.current;
    pageBusy.current = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(false);
      setSelected(null);
      void Promise.all([
        listHsk30Catalog(db, kind, String(band), search, 100, 0, reviewOnly),
        getHsk30Statistics(db),
      ])
        .then(([rows, counts]) => {
          if (gen === generation.current) {
            setItems(rows);
            setStats(counts);
            setMore(rows.length === 100);
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
  }, [db, kind, band, search, retry, reviewOnly]);
  useEffect(() => {
    let live = true;
    if (selected && kind === "grammar")
      void getHsk30GrammarExamples(db, selected.sourceId)
        .then((rows) => {
          if (live) setExamples(rows);
        })
        .catch(() => {
          if (live) setExampleError(true);
        });
    return () => {
      live = false;
    };
  }, [db, kind, selected, retry]);
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
        100,
        items.length,
        reviewOnly,
      );
      if (gen === generation.current) {
        setItems((current) => [...current, ...rows]);
        setMore(rows.length === 100);
      }
    } catch {
      if (gen === generation.current) setError(true);
    } finally {
      if (gen === generation.current) pageBusy.current = false;
    }
  };
  const levelStats = stats?.levels.find((row) => row.level === String(band));
  const count =
    stats?.counts.find((row) => row.kind === kind && row.level === String(band))
      ?.count ?? 0;
  const card = {
    padding: 14,
    gap: 8,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
  };
  const text = { color: theme.textPrimary, lineHeight: 24 };
  const muted = { color: theme.textMuted, lineHeight: 21 };
  return (
    <Screen
      title={labels[kind] + " · HSK " + band}
      subtitle="Danh mục HSK 3.0 · 11/2025"
    >
      <HskBandSelect
        value={band}
        allowAll={false}
        onChange={(value) => {
          if (value !== "all") setBand(value);
        }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {HSK30_KINDS.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: kind === value }}
            onPress={() => setKind(value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 9,
              minHeight: 44,
              borderRadius: 999,
              backgroundColor: kind === value ? theme.primary : theme.surface,
              borderWidth: 1,
              borderColor: kind === value ? theme.primary : theme.border,
            }}
          >
            <Text style={{ color: kind === value ? "#FFFFFF" : theme.textPrimary, fontWeight: "700" }}>{labels[value]}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={text}>
        {count} mục riêng cấp này
        {kind === "vocabulary"
          ? " · " + (levelStats?.cumulativeVocabulary ?? 0) + " mục tích lũy"
          : ""}
      </Text>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm trong bộ HSK 3.0 · 11/2025"
      />
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? (
        <PrimaryButton
          label="Chưa tải được · thử lại"
          onPress={() => setRetry((value) => value + 1)}
        />
      ) : null}
      {selected ? (
        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={card}>
          <Text selectable style={{ ...text, fontWeight: "800", fontSize: 18 }}>
            {title(selected.row, kind)}
          </Text>
          {kind === "grammar" ? (
            <>
              <Text selectable style={text}>
                {selected.row.pattern_zh ||
                  "Nguồn không cung cấp mẫu câu riêng."}
              </Text>
              <Text selectable style={text}>
                {[
                  selected.row.grammar_type_zh,
                  selected.row.category_zh,
                  selected.row.detail_zh,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text style={muted}>
                Chưa có giải thích và bản dịch tiếng Việt trong nguồn.
              </Text>
              {examples.map((item) => (
                <View
                  key={item.example_index}
                  style={{ gap: 6, paddingVertical: 8 }}
                >
                  <Text selectable style={text}>
                    {item.example_zh}
                  </Text>
                  <AudioButton text={item.example_zh!} />
                </View>
              ))}
              {exampleError ? (
                <PrimaryButton
                  label="Thử tải lại ví dụ"
                  onPress={() => setRetry((value) => value + 1)}
                />
              ) : null}
            </>
          ) : kind === "vocabulary" ? (
            <>
              <Text selectable style={text}>
                {selected.row.pinyin} ·{" "}
                {selected.row.pos_zh || "Nguồn không cung cấp từ loại."}
              </Text>
              <Text style={muted}>
                {selected.status === "MATCHED"
                  ? "Đã liên kết với từ có cùng chữ và cách đọc trong kho hiện có."
                  : selected.status === "CONFLICT"
                    ? "Cần đối chiếu cách đọc hoặc từ loại; chưa gán vào từ đang học."
                    : "Chưa có từ tương ứng trong kho đang học."}
              </Text>
              {selected.vocabularyId ? (
                <>
                  <Text selectable style={text}>
                    Nghĩa trong kho hiện có: {selected.meaningVi}
                  </Text>
                  <PrimaryButton
                    label="Mở từ trong kho hiện có"
                    onPress={() =>
                      router.push({
                        pathname: "/word/[id]",
                        params: {
                          id: selected.vocabularyId!,
                          hskSourceId: selected.sourceId,
                        },
                      } as Href)
                    }
                  />
                </>
              ) : null}
            </>
          ) : (
            <Text selectable style={text}>
              {selected.row.task_description_zh ?? ""}
            </Text>
          )}
          <Text selectable style={{ ...muted, fontSize: 11 }}>
            {selected.sourceId}
          </Text>
          <PrimaryButton
            label="Đóng chi tiết"
            variant="ghost"
            onPress={() => setSelected(null)}
          />
        </ScrollView>
      ) : null}
      <FlatList
        scrollEnabled={false}
        style={{ flexGrow: 0 }}
        data={items}
        keyExtractor={(item) => item.sourceId}
        initialNumToRender={12}
        onEndReached={() => {
          if (!error) void loadMore();
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={muted}>Không có mục phù hợp trong trang này.</Text>
          ) : null
        }
        ListFooterComponent={
          more ? (
            <PrimaryButton
              label="Xem tiếp"
              variant="ghost"
              onPress={() => void loadMore()}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              "Xem " + title(item.row, kind) + " · mục " + item.row.level_order
            }
            onPress={() => {
              setSelected(item);
              setExamples([]);
              setExampleError(false);
            }}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderColor: theme.border,
              gap: 4,
            }}
          >
            <Text style={{ ...text, fontSize: 18, fontWeight: "700" }}>
              {title(item.row, kind)}
            </Text>
            {kind === "task" ? (
              <Text numberOfLines={2} style={muted}>
                {item.row.task_description_zh}
              </Text>
            ) : null}
            <Text style={{ ...muted, fontSize: 11 }}>
              Mục {item.row.level_order}
            </Text>
            {kind === "vocabulary" && !item.meaningVi ? (
              <Text style={muted}>
                {item.row.pinyin} ·{" "}
                {item.status === "MATCHED"
                  ? "Đã liên kết với kho hiện có"
                  : item.status === "CONFLICT"
                    ? "Cần đối chiếu"
                    : "Chưa có trong kho hiện có"}
              </Text>
            ) : null}
            {kind === "vocabulary" ? <Text style={muted}>{item.meaningVi || "Chưa có nghĩa tiếng Việt"}</Text> : null}
            {kind === "vocabulary" && item.row.word ? <AudioButton text={item.row.word} /> : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}
