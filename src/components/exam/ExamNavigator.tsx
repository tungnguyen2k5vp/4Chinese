import { useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { examSkillLabels } from '@/services/exam/engine';
import { examAnswerCounts, examAnswerState } from '@/services/exam/presentation';
import type { ExamSnapshot } from '@/services/exam/session';
import { useTheme } from '@/theme/ThemeProvider';

export function ExamNavigator({ visible, snapshot, currentIndex, canGo, review = false, onSelect, onClose }: {
  visible: boolean; snapshot: ExamSnapshot; currentIndex: number; canGo: (index: number) => boolean; review?: boolean;
  onSelect: (index: number) => void; onClose: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'flagged'>('all');
  const counts = examAnswerCounts(snapshot.questions, snapshot.answers);
  if (!visible) return null;
  return <Modal visible={visible} animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16, gap: 12, borderBottomWidth: 1, borderColor: theme.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text accessibilityRole="header" style={{ flex: 1, fontSize: 23, fontWeight: '800', color: theme.textPrimary }}>Bảng câu hỏi</Text>
          <PrimaryButton label="Đóng" variant="ghost" onPress={onClose} />
        </View>
        <Text style={{ color: theme.textSecondary }}>{counts.answered}/{counts.total} đã làm · {counts.unanswered} bỏ trống · {snapshot.flaggedIds.length} đánh dấu</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['all', 'unanswered', 'flagged'] as const).map(value => <MotionPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: value === filter }}
            onPress={() => setFilter(value)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 14, backgroundColor: filter === value ? theme.primarySoft : theme.surface }}>
            <Text style={{ color: theme.primaryText, fontWeight: '700' }}>{value === 'all' ? 'Tất cả' : value === 'unanswered' ? 'Chưa làm' : 'Đánh dấu'}</Text>
          </MotionPressable>)}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {snapshot.profile.sections.map(section => {
          const items = snapshot.questions.map((question, index) => ({ question, index })).filter(({ question }) => question.skill === section.skill &&
            (filter === 'all' || (filter === 'unanswered' ? snapshot.answers[question.id] === undefined : snapshot.flaggedIds.includes(question.id))));
          const sectionCounts = examAnswerCounts(snapshot.questions.filter(question => question.skill === section.skill), snapshot.answers);
          return <View key={section.skill} style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={{ color: theme.textPrimary, fontSize: 18, fontWeight: '800' }}>{examSkillLabels[section.skill]} · {sectionCounts.answered}/{sectionCounts.total} đã làm</Text>
            {!items.length ? <Text style={{ color: theme.textMuted }}>Không có câu thuộc bộ lọc này.</Text> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {items.map(({ question, index }) => {
                const status = examAnswerState(question, snapshot.answers);
                const flagged = snapshot.flaggedIds.includes(question.id);
                const answered = status !== 'unanswered';
                const enabled = canGo(index);
                const color = review && answered ? status === 'correct' ? theme.success : theme.error : theme.primaryText;
                return <MotionPressable key={question.id} accessibilityRole="button" disabled={!enabled}
                  accessibilityState={{ selected: currentIndex === index, disabled: !enabled }}
                  accessibilityLabel={`Câu ${index + 1}, ${review && answered ? status === 'correct' ? 'đúng' : 'sai' : answered ? 'đã làm' : 'chưa làm'}${flagged ? ', đánh dấu' : ''}${!enabled ? ', đang khóa' : ''}`}
                  onPress={() => onSelect(index)} style={{ minWidth: 52, minHeight: 52, padding: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2,
                    borderWidth: currentIndex === index ? 2 : 1, borderColor: currentIndex === index ? theme.primary : theme.border,
                    backgroundColor: answered ? theme.primarySoft : theme.surface, opacity: enabled ? 1 : 0.4 }}>
                  <Text style={{ color, fontWeight: '800', fontSize: 17 }}>{index + 1}{flagged ? ' ⚑' : ''}</Text>
                  <Text style={{ color, fontSize: 12 }}>{review && answered ? status === 'correct' ? '✓' : '✕' : answered ? '●' : '—'}</Text>
                </MotionPressable>;
              })}
            </View>}
          </View>;
        })}
        <Text style={{ color: theme.textMuted, lineHeight: 21 }}>{review ? '✓ Đúng · ✕ Sai · — Bỏ trống · ⚑ Đánh dấu' : '● Đã làm · — Chưa làm · ⚑ Đánh dấu. Câu mờ thuộc phần đã khóa hoặc chưa mở.'}</Text>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
