import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Disclosure } from '@/components/chinese/Disclosure';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { AnimatedProgressBar } from '@/components/ui/AnimatedProgressBar';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { radius, spacing } from '@/constants/design';
import { getXpJourney, xpMilestones } from '@/services/stats/xp-journey';
import { useTheme } from '@/theme/ThemeProvider';

export function XpJourneyCard({ totalXp, todayXp, expanded = false, onPress }: {
  totalXp: number; todayXp: number; expanded?: boolean; onPress?: () => void;
}) {
  const theme = useTheme();
  const s = StyleSheet.create({
    card: { backgroundColor: theme.primarySoft, borderRadius: radius.lg, padding: spacing.lg, gap: 14, borderWidth: 1, borderColor: theme.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    emblem: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, minWidth: 0, gap: 3 },
    eyebrow: { color: theme.primaryText, fontSize: 11, fontWeight: '800' },
    title: { color: theme.textPrimary, fontSize: 20, fontWeight: '900' },
    copy: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
    xp: { color: theme.primaryText, fontSize: 24, fontWeight: '900' },
    total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    path: { gap: 8, paddingTop: 8 },
    step: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
    stepText: { flex: 1, color: theme.textPrimary, fontSize: 13, fontWeight: '700' },
    button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 },
  });
  const journey = getXpJourney(totalXp, todayXp);
  return <View style={s.card} testID="xp-journey">
    <View style={s.row}>
      <View style={s.emblem}><Ionicons name={journey.title.icon} size={28} color={theme.primaryText} /></View>
      <View style={s.body}><Text style={s.eyebrow}>DANH HIỆU XP · CẤP {journey.level}</Text><Text style={s.title}>{journey.title.title}</Text></View>
    </View>
    <View style={s.total}><AnimatedNumber testID="journey-total-xp" style={s.xp} value={journey.totalXp} suffix=" XP" /><Text style={s.copy}>+{journey.todayXp} hôm nay</Text></View>
    <AnimatedProgressBar progress={journey.levelProgress} color={theme.primary} trackColor={theme.border} height={9} accessibilityLabel={`Cấp XP ${journey.level}, còn ${journey.remainingXp} XP lên cấp ${journey.level + 1}`} />
    <Text style={s.copy}>Còn {journey.remainingXp} XP lên cấp {journey.level + 1}{journey.nextTitle ? ` · ${journey.nextTitle.xp.toLocaleString('vi-VN')} XP mở “${journey.nextTitle.title}”` : ' · Tất cả danh hiệu đã mở'}.</Text>
    {expanded ? <>
      <View style={s.total}><Text style={s.eyebrow}>CHẶNG HÔM NAY</Text><Text style={s.copy}>{journey.dailyDone ? 'Đã đạt 200 XP ✓' : `${journey.todayXp} / ${journey.dailyTarget} XP`}</Text></View>
      <AnimatedProgressBar progress={journey.dailyProgress} color={theme.success} trackColor={theme.border} height={7} accessibilityLabel={`Chặng hôm nay: ${journey.todayXp} trên ${journey.dailyTarget} XP`} />
      <Disclosure title="Bộ sưu tập danh hiệu XP"><View style={s.path}>{xpMilestones.map(item => {
        const open = journey.totalXp >= item.xp;
        return <View key={item.xp} style={s.step} accessible accessibilityLabel={`${item.title}, ${item.xp} XP, ${open ? 'đã mở' : 'chưa mở'}`}>
          <Ionicons name={open ? item.icon : 'lock-closed-outline'} color={open ? theme.primaryText : theme.textMuted} size={20} />
          <Text style={s.stepText}>{item.title}</Text><Text style={s.copy}>{open ? 'Đã mở ✓' : `${item.xp.toLocaleString('vi-VN')} XP`}</Text>
        </View>;
      })}</View></Disclosure>
      <Text style={s.copy}>Tích XP để mở danh hiệu. Cấp XP không phải cấp HSK hay mức nhớ từ. Không mất XP khi nghỉ học.</Text>
    </> : null}
    {onPress ? <MotionPressable haptic accessibilityLabel="Xem lộ trình XP và mục tiêu" onPress={onPress} style={s.button}><Text style={s.eyebrow}>DANH HIỆU & MỤC TIÊU</Text><Ionicons name="arrow-forward" size={20} color={theme.primaryText} /></MotionPressable> : null}
  </View>;
}
