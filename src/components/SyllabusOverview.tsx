import { router, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { HskBandSelect } from './HskBandSelect';
import { PrimaryButton } from './PrimaryButton';

import { themedCard } from '@/constants/design';
import { getHsk30Statistics } from '@/db/hsk30';
import { getSyllabusAlignment, syllabus, syllabusGoals, syllabusLevel, type SyllabusRow } from '@/services/hsk/syllabus';
import { useTheme } from '@/theme/ThemeProvider';
import type { HskBand } from '@/types/models';

export function SyllabusOverview() {
  const db = useSQLiteContext(), theme = useTheme();
  const [band, setBand] = useState<HskBand>(1);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getHsk30Statistics>> | null>(null);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    void getHsk30Statistics(db).then(value => { if (live) { setStats(value); setError(false); } })
      .catch(() => { if (live) setError(true); });
    return () => { live = false; };
  }, [db, retry]);
  const count = (kind: string) => stats?.counts.find(row => row.kind === kind && row.level === String(band))?.count ?? 0;
  return <View style={{ gap: 14 }}>
    <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '800' }}>HSK 3.0 · bộ 2025/2026</Text>
    <Text style={{ color: theme.textMuted }}>Phiên bản 11/2025 · danh mục nguyên văn tiếng Trung</Text>
    <HskBandSelect value={band} allowAll={false} onChange={value => { if (value !== 'all') setBand(value); }} />
    {!stats && !error ? <ActivityIndicator color={theme.primary} /> : null}
    {error ? <PrimaryButton label="Thử tải lại số liệu" onPress={() => setRetry(value => value + 1)} /> : null}
    {stats ? <View style={{ ...themedCard(theme), gap: 10 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{count('vocabulary')} mục từ riêng HSK {band}</Text>
      <Text style={{ color: theme.textMuted }}>{stats.levels.find(row => row.level === String(band))?.cumulativeVocabulary ?? 0} mục từ tích lũy đến cấp này</Text>
      <Text style={{ color: theme.textMuted }}>{count('grammar')} ngữ pháp · {count('topic')} chủ đề · {count('task')} nhiệm vụ giao tiếp · {count('hanzi')} Hán tự</Text>
      <PrimaryButton label="Tra cứu bộ HSK 3.0 · 11/2025" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band: String(band) } } as Href)} />
      <Text style={{ color: theme.textMuted }}>Số liệu tính theo mục trong nguồn, gồm cả những mục chưa liên kết với kho đang học. HSK 7–9 là một nhóm chung.</Text>
    </View> : null}
    <Text style={{ color: theme.textMuted }}>Bộ này chưa cung cấp nghĩa và giải thích tiếng Việt. Nội dung và tiến độ học trong kho hiện có được giữ nguyên.</Text>
    <PrimaryButton label="Xem tài liệu PDF đã lưu trước đây" variant="ghost" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { source: 'legacy-pdf', band: String(band) } } as Href)} />
  </View>;
}

export function LegacySyllabusOverview() {
  const db = useSQLiteContext(); const theme = useTheme();
  const [band, setBand] = useState<HskBand>(1);
  const [rows, setRows] = useState<SyllabusRow[] | null>(null);
  const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { let live = true; void getSyllabusAlignment(db).then(data => { if (live) { setRows(data); setError(false); } }).catch(() => { if (live) setError(true); }); return () => { live = false; }; }, [db, retry]);
  const level = syllabusLevel(band);
  const selected = rows?.filter(row => row.level === level) ?? [];
  const counts = (status: SyllabusRow['status']) => selected.filter(row => row.status === status).length;
  return <View style={{ gap: 14 }}>
    <Text style={{ color: theme.textPrimary, fontSize: 21, fontWeight: '800' }}>Chương trình HSK chính thức</Text>
    <Text style={{ color: theme.textMuted }}>Bản {syllabus.version} · tra cứu trên máy</Text>
    <HskBandSelect value={band} allowAll={false} onChange={value => { if (value !== 'all') setBand(value); }} />
    <View style={{ ...themedCard(theme), gap: 12 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 18 }}>Bạn cần học gì ở HSK {band}?</Text>
      <Text style={{ color: theme.textMuted, lineHeight: 22 }}>{syllabusGoals[level]}</Text>
      <Text style={{ color: theme.primaryText, fontWeight: '800' }}>{syllabus.vocabulary.filter(row => row.level === level).length} mục từ mới trong cấp này</Text>
      <Text style={{ color: theme.textMuted }}>Từ vựng · ngữ pháp · Hán tự · chủ đề · nhiệm vụ giao tiếp</Text>
      <PrimaryButton label="Xem nội dung theo cấp" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band: String(band) } } as unknown as Href)} />
    </View>
    {!rows && !error ? <ActivityIndicator color={theme.primary} /> : error ? <PrimaryButton label="Thử đối chiếu lại" onPress={() => setRetry(value => value + 1)} /> : <View style={{ ...themedCard(theme), gap: 8 }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '800' }}>Đối chiếu với kho từ hiện tại</Text>
      <Text style={{ color: theme.textMuted }}>Khớp chữ, cách đọc và cấp: {counts('matched')}</Text>
      <Text style={{ color: theme.textMuted }}>Khác cấp: {counts('levelConflict')} · cần xem cách đọc: {counts('readingReview')}</Text>
      <Text style={{ color: theme.textMuted }}>Chưa có trong kho: {counts('missing')}</Text>
      <PrimaryButton variant="secondary" label="Xem những mục cần bổ sung" onPress={() => router.push({ pathname: '/hsk/syllabus', params: { band: String(band), filter: 'review' } } as unknown as Href)} />
    </View>}
    <Text style={{ color: theme.textMuted, fontSize: 12, lineHeight: 19 }}>Số liệu đối chiếu danh mục, chưa đánh giá kiến thức của bạn. Kho từ đang dùng cấp theo CSV đã nhập; các chênh lệch với tài liệu chính thức được hiển thị để tra cứu.</Text>
  </View>;
}
