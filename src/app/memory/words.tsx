import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Disclosure } from "@/components/chinese/Disclosure";
import {
  ChineseMemoryOnly,
  MemoryLink,
  MemoryLoadState,
  useMemoryResource,
} from "@/components/memory/MemoryPrimitives";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { themedCard } from "@/constants/design";
import { listMemoryCandidates, type MemoryCandidate } from "@/db/hanzi-memory";
import { contrastGroupForCharacter } from "@/services/memory/character-content";
import {
  classifyMemoryError,
  errorLabels,
  memoryRescueEvidence,
} from "@/services/memory/hanzi-memory";
import { useTheme } from "@/theme/ThemeProvider";
export default function MemoryWords() {
  return (
    <ChineseMemoryOnly>
      <Words />
    </ChineseMemoryOnly>
  );
}
function Words() {
  const { mode = "weak", size = "5" } = useLocalSearchParams<{
    mode?: string;
    size?: string;
  }>();
  const db = useSQLiteContext(),
    theme = useTheme();
  const scope = mode === "old" ? "old" : mode === "weak" ? "weak" : "all";
  const resource = useMemoryResource(
    useCallback(() => listMemoryCandidates(db, scope, 50), [db, scope]),
    true,
  );
  const title =
    mode === "old"
      ? "Ôn chữ cũ"
      : mode === "structure"
        ? "Học cấu tạo chữ"
        : "Chữ hay quên";
  return (
    <Screen
      title={title}
      hideHeader
    >
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 22, fontWeight: '800', flexShrink: 1 }}>{title}</Text>
          {resource.data ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>{resource.data.length} từ</Text> : null}
        </View>
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{mode === 'old' ? 'Từ đã học từ 30 ngày trước.' : mode === 'structure' ? 'Chọn từ để xem thành phần và mẹo nhớ.' : 'Luyện thêm những từ bạn dễ quên.'}</Text>
      </View>
      <MemoryLoadState {...resource} />
      {resource.data?.length && mode !== "structure" ? (
        <PrimaryButton
          label="Bắt đầu luyện"
          onPress={() =>
            router.push(
              `/memory/session?mode=${scope === "old" ? "old" : "weak"}&size=${size}` as Href,
            )
          }
        />
      ) : null}
      {resource.data?.length === 0 ? (
        <View style={themedCard(theme)}>
          <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
            Chưa có từ phù hợp
          </Text>
          <Text style={{ color: theme.textMuted, marginTop: 8 }}>
            {mode === "old"
              ? "Chưa có từ với ngày học cách đây ít nhất 30 ngày. Bạn vẫn có thể luyện các từ đã học."
              : "Các từ đã học hoặc có lịch sử quên sẽ xuất hiện ở đây."}
          </Text>
          <MemoryLink
            label="Về củng cố trí nhớ"
            onPress={() => router.replace("/memory" as Href)}
          />
        </View>
      ) : null}
      {resource.data?.length ? <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
        {resource.data.map(candidate => <MemoryWordRow key={candidate.word.id} candidate={candidate} mode={mode} />)}
      </View> : null}
      {resource.data?.length === 50 ? (
        <Text style={{ color: theme.textMuted }}>
          Đang hiển thị 50 từ ưu tiên; các phiên được giới hạn theo số từ bạn
          chọn.
        </Text>
      ) : null}
      <Disclosure title="Về danh sách này">
        <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{mode === 'old' ? 'Ưu tiên từ đã học ít nhất 30 ngày, có lịch sử quên hoặc lâu chưa luyện.' : 'Gợi ý từ dữ liệu học hiện có. Bấm biểu tượng thông tin để xem lịch sử và gợi ý chi tiết.'} Phiên bổ trợ không đổi lịch ôn hay cấp nhớ.</Text>
      </Disclosure>
    </Screen>
  );
}

function MemoryWordRow({ candidate, mode }: { candidate: MemoryCandidate; mode: string }) {
  const theme = useTheme();
  const [details, setDetails] = useState(false);
  const evidence = [...candidate.mistakes].sort((a, b) => b.wrong_count - a.wrong_count)[0];
  const kind = evidence ? classifyMemoryError(evidence) : 'UNKNOWN';
  const rescue = memoryRescueEvidence(candidate.mistakes)[0];
  const group = Array.from(candidate.word.simplified).map(contrastGroupForCharacter).find(Boolean);
  return <View style={{ padding: 12, gap: 4, borderBottomWidth: 1, borderColor: theme.border }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <MotionPressable pressedScale={0.98} accessibilityLabel={`${mode === 'structure' ? 'Xem cấu tạo' : 'Củng cố'} ${candidate.word.simplified}. ${candidate.word.primaryMeaningVi}`} onPress={() => router.push({
        pathname: mode === 'structure' ? '/memory/structure' : '/memory/session',
        params: { id: candidate.word.id, mode: 'weak', assisted: '1' },
      } as Href)} style={{ flex: 1, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 2 }}>
            <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 26, flexShrink: 1 }}>{candidate.word.simplified}</Text>
            <PinyinText value={candidate.word.pinyin} style={{ fontSize: 14 }} />
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>{candidate.word.primaryMeaningVi}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18 }}>Quên {candidate.lapseCount} lần{candidate.lastReviewAt ? ` · Ôn ${new Date(candidate.lastReviewAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}` : ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.primaryText} />
      </MotionPressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`Chi tiết ${candidate.word.simplified}`} accessibilityState={{ expanded: details }} aria-expanded={details} onPress={() => setDetails(value => !value)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={details ? 'close-circle-outline' : 'information-circle-outline'} size={21} color={theme.textMuted} />
      </Pressable>
    </View>
    {details ? <StudyTransition turnKey={candidate.word.id} effect="reveal" animateOnMount style={{ gap: 6, padding: 10, borderRadius: 12, backgroundColor: theme.backgroundSecondary }}>
      <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>Sai {candidate.wrongCount} · quên lại {candidate.lapseCount} lần · {errorLabels[kind]}</Text>
      {candidate.lastReviewAt ? <Text style={{ color: theme.textMuted, fontSize: 12 }}>Ôn gần nhất: {new Date(candidate.lastReviewAt).toLocaleDateString('vi-VN')}</Text> : null}
      {rescue?.cluster ? <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 18 }}>{rescue.cluster.thresholdReason}</Text> : null}
      {rescue?.cluster?.microLesson ? <Text style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 19 }}>{rescue.cluster.microLesson.steps.join(' → ')}</Text> : null}
      {group ? <MemoryLink label={`Đối chiếu ${group.title}`} onPress={() => router.push(`/memory/confusables?group=${group.id}` as Href)} /> : null}
    </StudyTransition> : null}
  </View>;
}
