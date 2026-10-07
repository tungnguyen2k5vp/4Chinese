import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/design';
import { useConfirmation } from '@/hooks/use-confirmation';
import { stopChineseSpeech } from '@/services/audio/chinese-speech';
import { getRecordingLibrary, type SavedRecording } from '@/services/speaking/recording-library';
import { useTheme } from '@/theme/ThemeProvider';

export default function RecordingsScreen() {
  const theme = useTheme();
  if (Platform.OS === 'web') return <Screen title="Bản ghi tại máy"><Text style={{ color: theme.textMuted }}>Thư viện âm thanh riêng hiện hỗ trợ Android/iOS; không đồng bộ lên web hoặc sao lưu JSON của app.</Text></Screen>;
  return <NativeRecordings />;
}
function NativeRecordings() {
  const theme = useTheme(); const player = useAudioPlayer(null); const status = useAudioPlayerStatus(player);
  const { ask, dialog } = useConfirmation();
  const [rows, setRows] = useState<SavedRecording[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const lease = useRef<{ release(): void } | null>(null);
  const active = useRef(false); const generation = useRef(0); const operation = useRef(false);
  const stop = useCallback(() => {
    generation.current++;
    try { player.pause(); player.replace(null); }
    catch { return false; } // Fail closed: retain lease if stopping cannot be confirmed.
    lease.current?.release(); lease.current = null; setPlayingId(null);
    return true;
  }, [player]);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { const result = await (await getRecordingLibrary()).list(); if (active.current) { setRows(result); setNotice(null); } }
    catch { if (active.current) setNotice('Chưa đọc/dọn được thư viện. Không tự xóa khi manifest lỗi; hãy thử lại.'); }
    finally { setBusy(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true; void refresh();
    const listener = AppState.addEventListener('change', (next) => {
      if (next !== 'active') { active.current = false; stop(); }
      else { active.current = true; void refresh(); }
    });
    return () => { active.current = false; listener.remove(); stop(); };
  }, [refresh, stop]));
  useEffect(() => {
    const listener = player.addListener('playbackStatusUpdate', (event) => {
      if (event.didJustFinish || event.error) stop();
    });
    return () => listener.remove();
  }, [player, stop]);
  const play = async (row: SavedRecording) => {
    if (operation.current || !active.current) return;
    if (playingId === row.id) { stop(); return; }
    if (!stop()) { setNotice('Chưa dừng được âm thanh hiện tại. Không mở hoặc xóa bản khác.'); return; }
    const request = generation.current; operation.current = true; setBusy(true);
    let acquired: { uri: string; release(): void } | null = null;
    try {
      await stopChineseSpeech(); await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      acquired = await (await getRecordingLibrary()).acquire(row.id);
      if (!active.current || generation.current !== request) { acquired.release(); return; }
      lease.current = acquired; player.replace({ uri: acquired.uri }); player.play(); setPlayingId(row.id);
    } catch { acquired?.release(); if (lease.current === acquired) lease.current = null; if (active.current) setNotice('Bản ghi hết hạn, đã mất hoặc không phát được.'); }
    finally { operation.current = false; setBusy(false); }
  };
  const remove = async (row: SavedRecording) => {
    const confirmed = await ask({ title: 'Xóa bản ghi âm tại máy?', message: 'Thao tác này không hoàn tác nhưng không ảnh hưởng lịch sử thông tin lượt nói.', acceptLabel: 'Xóa bản ghi', cancelLabel: 'Giữ lại' });
    if (!confirmed || operation.current || !active.current) return;
    if (!stop()) { setNotice('Chưa dừng được âm thanh. Không xóa bản đang sử dụng.'); return; }
    operation.current = true; setBusy(true);
    void getRecordingLibrary().then((library) => library.delete(row.id, true)).then(refresh)
      .catch(() => { if (active.current) setNotice('Chưa xóa được; bản ghi có thể đang được sử dụng.'); })
      .finally(() => { operation.current = false; setBusy(false); });
  };
  return <Screen title="Bản ghi tại máy" subtitle="Âm thanh riêng · không vào DB/sao lưu JSON của app và không gửi mạng">
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: theme.textMuted }}>Chỉ chứa bản sao bạn đã chủ động lưu. Tối đa 50 bản / 64 MiB, mỗi bản 8 MiB / 120 giây. Hết hạn 7/30 ngày được dọn khi truy cập, không phải dịch vụ nền. Tự xóa giữ đến khi bạn xóa; gỡ app có thể mất tất cả.</Text>
      <Text style={{ color: theme.textMuted }}>Sao lưu hệ điều hành là cơ chế riêng; việc loại trừ âm thanh khỏi Android/iCloud chưa được xác minh trên thiết bị.</Text>
      <PrimaryButton label="Đọc lại và dọn bản hết hạn" variant="secondary" disabled={busy} onPress={() => void refresh()} />
      {notice || status.error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.error }}>{notice ?? 'Không phát được bản ghi tại máy.'}</Text> : null}
      {!busy && !rows.length && !notice ? <EmptyState variant="speaking" scene="recordings" title="Chưa có bản ghi đã lưu" message="Chọn thời hạn rồi bấm Lưu trong công cụ ghi âm. Bản ghi chỉ nằm trên thiết bị này." /> : null}
      {rows.map((row) => <View key={row.id} style={{ gap: spacing.sm }}>
        <Text style={{ color: theme.textPrimary }}>{row.createdAt.slice(0, 16).replace('T', ' ')} UTC · {Math.ceil(row.durationMs / 1000)} giây · {Math.ceil(row.bytes / 1024)} KiB</Text>
        <Text style={{ color: theme.textMuted }}>{row.expiresAt ? `Hết hạn: ${row.expiresAt.slice(0, 10)} (UTC)` : 'Giữ đến khi tự xóa'}</Text>
        <PrimaryButton label={playingId === row.id ? 'Dừng nghe' : 'Nghe bản ghi'} variant="secondary" disabled={busy} onPress={() => void play(row)} />
        <PrimaryButton label="Xóa bản ghi này" variant="danger" disabled={busy} onPress={() => remove(row)} />
      </View>)}
    </View>
    {dialog}
  </Screen>;
}
