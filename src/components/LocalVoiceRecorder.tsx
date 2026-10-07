import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

import { spacing } from '@/constants/design';
import { stopChineseSpeech } from '@/services/audio/chinese-speech';
import { LocalRecording, type LocalRecordingState } from '@/services/speaking/local-recording';
import { assertRecordingPath, getRecordingLibrary, type RecordingRetention } from '@/services/speaking/recording-library';
import { useTheme } from '@/theme/ThemeProvider';

/** Reports stopped native duration once, never a URI; denial/cancellation cannot complete. */
export class RecorderCompletion {
  private started = false;
  private durationMs = 0;
  constructor(private maxDurationMs: number) {}
  begin() { this.started = true; this.durationMs = 0; }
  stopped(beforeMs: number, afterMs: number) {
    const durations = [beforeMs, afterMs].filter((value) => Number.isFinite(value) && value > 0);
    this.durationMs = durations.length ? Math.min(this.maxDurationMs, Math.round(Math.max(...durations))) : 0;
  }
  cancel() { this.started = false; this.durationMs = 0; }
  complete(callback?: (durationMs: number) => void) {
    if (!this.started || this.durationMs < 1) return;
    const duration = this.durationMs;
    this.cancel();
    callback?.(duration);
  }
}

export function LocalVoiceRecorder({ onRecordingChange, onRecordingComplete, onReplay, onReplayComplete, playbackBlocked = false, recordingBlocked = false, maxDurationSeconds = 30 }: {
  onRecordingChange?: (busy: boolean) => void; onRecordingComplete?: (durationMs: number) => void; onReplay?: () => void; onReplayComplete?: () => void; playbackBlocked?: boolean; recordingBlocked?: boolean; maxDurationSeconds?: number;
}) {
  const theme = useTheme();
  if (Platform.OS === 'web') return <Text style={{ color: theme.textMuted }}>Nghe mẫu trên web; ghi âm đối chiếu hiện hỗ trợ bản Android/iOS.</Text>;
  return <NativeRecorder onRecordingChange={onRecordingChange} onRecordingComplete={onRecordingComplete} onReplay={onReplay} onReplayComplete={onReplayComplete} playbackBlocked={playbackBlocked} recordingBlocked={recordingBlocked} maxDurationSeconds={maxDurationSeconds} />;
}

function NativeRecorder({ onRecordingChange, onRecordingComplete, onReplay, onReplayComplete, playbackBlocked, recordingBlocked, maxDurationSeconds }: {
  onRecordingChange?: (busy: boolean) => void; onRecordingComplete?: (durationMs: number) => void; onReplay?: () => void; onReplayComplete?: () => void; playbackBlocked: boolean; recordingBlocked: boolean; maxDurationSeconds: number;
}) {
  const theme = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const [state, setState] = useState<LocalRecordingState>({ phase: 'idle', uri: null, notice: null });
  const [durationMs, setDurationMs] = useState(0);
  const [retention, setRetention] = useState<RecordingRetention>('SESSION');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveController = useRef<AbortController | null>(null);
  const saveTask = useRef<Promise<unknown> | null>(null);
  const recordGeneration = useRef(0);
  const savedGeneration = useRef<number | null>(null);
  const replayGeneration = useRef(0);
  const focused = useRef(false);
  const replayRequested = useRef(false);
  const completionPending = useRef(false);
  const completion = useMemo(() => new RecorderCompletion(maxDurationSeconds * 1000), [maxDurationSeconds]);
  const recording = useMemo(() => new LocalRecording({
    permission: async () => (await requestRecordingPermissionsAsync()).granted,
    mode: async (allowsRecording) => { await setAudioModeAsync({ allowsRecording, playsInSilentMode: true }); },
    prepare: () => recorder.prepareToRecordAsync(), record: () => {
      recorder.record({ forDuration: maxDurationSeconds }); completion.begin();
    },
    stop: async () => {
      let before = 0;
      try { before = recorder.getStatus().durationMillis; } catch { /* Stop must still release a reset recorder. */ }
      await recorder.stop();
      let after = 0;
      try { after = recorder.getStatus().durationMillis; } catch { /* Some native implementations clear status on stop. */ }
      completion.stopped(before, after);
    }, uri: () => recorder.uri,
    remove: (uri) => {
      assertRecordingPath(uri, `${Paths.cache.uri.replace(/\/+$/, '')}/`);
      if (!/\.m4a$/i.test(uri)) return;
      try { if (recorder.getStatus().isRecording && recorder.uri === uri) return; }
      catch { return; } // Unknown native state: prefer a temporary orphan over deleting active audio.
      const file = new File(uri); if (file.exists) file.delete();
    },
  }, setState, maxDurationSeconds * 1000), [completion, maxDurationSeconds, recorder]);
  useEffect(() => { onRecordingChange?.(state.phase === 'busy' || state.phase === 'recording'); }, [onRecordingChange, state.phase]);
  useEffect(() => {
    if (state.phase === 'ready' && state.uri && !state.notice && focused.current) completion.complete((duration) => {
      setDurationMs(duration); onRecordingComplete?.(duration);
    });
    if (state.phase === 'idle') completion.cancel();
  }, [completion, onRecordingComplete, state.notice, state.phase, state.uri]);
  useEffect(() => {
    if (playbackBlocked) { replayGeneration.current++; replayRequested.current = false; completionPending.current = false; player.pause(); }
  }, [playbackBlocked, player]);
  useEffect(() => {
    if (playback.playing && replayRequested.current) { replayRequested.current = false; completionPending.current = true; onReplay?.(); }
  }, [onReplay, playback.playing]);
  useEffect(() => {
    if (playback.didJustFinish && completionPending.current) { completionPending.current = false; onReplayComplete?.(); }
  }, [onReplayComplete, playback.didJustFinish]);
  useEffect(() => {
    if (playback.error) { replayRequested.current = false; completionPending.current = false; }
  }, [playback.error]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    recording.activate();
    const cancel = () => {
      focused.current = false; completion.cancel(); replayGeneration.current++; replayRequested.current = false; completionPending.current = false;
      recordGeneration.current++; savedGeneration.current = null;
      saveController.current?.abort();
      try { player.pause(); player.replace(null); } catch { /* Player already released. */ }
      // Do not remove the source while an explicitly requested copy is in flight.
      void recording.cancel(saveTask.current ?? undefined);
      setDurationMs(0); setSaved(false); setRetention('SESSION');
      setState({ phase: 'idle', uri: null, notice: null });
      onRecordingChange?.(false);
    };
    const listener = AppState.addEventListener('change', (next) => {
      if (next !== 'active') cancel(); else { focused.current = true; recording.activate(); }
    });
    return () => { listener.remove(); cancel(); };
  }, [completion, onRecordingChange, player, recording]));
  const busy = state.phase === 'busy' || state.phase === 'recording' || saving;
  const record = async () => {
    if (recordingBlocked || state.phase === 'busy' || saveTask.current) return;
    replayGeneration.current++; replayRequested.current = false; completionPending.current = false;
    player.pause(); player.replace(null);
    onRecordingChange?.(true);
    await stopChineseSpeech().catch(() => undefined);
    if (!focused.current) return;
    if (state.phase === 'recording') await recording.stop(); else {
      recordGeneration.current++; savedGeneration.current = null;
      completion.cancel(); setDurationMs(0); setSaved(false); setRetention('SESSION'); await recording.start();
    }
  };
  const saveRecording = () => {
    if (retention === 'SESSION' || !state.uri || !durationMs || busy || saved) return;
    const source = state.uri; const selected = retention; const recordingVersion = recordGeneration.current;
    Alert.alert('Lưu âm thanh riêng tại máy?',
      selected === 'MANUAL' ? 'Giữ đến khi bạn tự xóa. Không vào DB/sao lưu JSON của app và không gửi mạng. Loại trừ sao lưu hệ điều hành chưa được xác minh trên thiết bị. Xóa app có thể mất bản ghi.' :
        `Giữ ${selected === '7_DAYS' ? 7 : 30} ngày từ lúc lưu; dọn khi mở thư viện. Không vào DB/sao lưu JSON của app và không gửi mạng. Loại trừ sao lưu hệ điều hành chưa được xác minh trên thiết bị.`,
      [{ text: 'Hủy', style: 'cancel' }, { text: 'Lưu tại máy', onPress: () => {
        if (!focused.current || saveTask.current || recordGeneration.current !== recordingVersion || savedGeneration.current === recordingVersion) return;
        const controller = new AbortController(); saveController.current = controller;
        replayGeneration.current++; player.pause(); player.replace(null);
        replayRequested.current = false; completionPending.current = false;
        setSaving(true);
        const task = (async () => {
          const library = await getRecordingLibrary();
          await library.list();
          await library.save({ source, durationMs, retention: selected, confirmed: true, signal: controller.signal });
          if (focused.current && !controller.signal.aborted) {
            savedGeneration.current = recordingVersion;
            setSaved(true); setState((current) => ({ ...current, notice: 'Đã lưu bản sao riêng tại máy. Bản phiên vẫn xóa khi rời màn hình.' }));
          }
        })().catch(() => { if (focused.current && !controller.signal.aborted) setState((current) => ({ ...current, notice: 'Chưa lưu được bản ghi; có thể thư viện đầy hoặc bộ nhớ không sẵn sàng. Bản phiên vẫn chỉ tạm thời.' })); })
          .finally(() => { if (saveTask.current === task) { saveTask.current = null; saveController.current = null; } setSaving(false); });
        saveTask.current = task;
      } }]);
  };
  return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: theme.textMuted, fontSize: 12 }}>Micro chỉ dùng để nghe lại, tối đa {maxDurationSeconds} giây. Không gửi lên mạng. Mặc định chỉ trong phiên: xóa khi rời màn hình/vào nền hoặc ghi lại. Chỉ bản sao đã bấm Lưu mới giữ lâu hơn.</Text>
    <PrimaryButton label={state.phase === 'recording' ? 'Dừng ghi âm' : 'Ghi âm đối chiếu'} disabled={recordingBlocked || saving} loading={state.phase === 'busy'} onPress={() => void record()} variant={state.phase === 'recording' ? 'danger' : 'secondary'} />
    {state.phase === 'recording' ? <Text style={{ color: theme.primaryText }}>Còn tối đa {Math.max(0, Math.ceil(maxDurationSeconds - recorderState.durationMillis / 1000))} giây ghi âm</Text> : null}
    <PrimaryButton label={playback.playing ? 'Dừng nghe bản ghi' : 'Nghe bản ghi của tôi'} disabled={!state.uri || busy || playbackBlocked}
      variant="ghost" onPress={() => {
        void (async () => {
          const request = ++replayGeneration.current;
          try {
            if (player.playing) { player.pause(); replayRequested.current = false; completionPending.current = false; return; }
            await stopChineseSpeech();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            if (!state.uri || !focused.current || request !== replayGeneration.current) return;
            replayRequested.current = true; completionPending.current = false;
            player.replace({ uri: state.uri }); player.play();
          } catch { replayRequested.current = false; completionPending.current = false; setState((current) => ({ ...current, notice: 'Chưa phát được bản ghi. Hãy thử lại.' })); }
        })();
      }} />
    <Text style={{ color: theme.textMuted }}>Thời hạn bản sao riêng (không tự lưu)</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
      {([['SESSION', 'Chỉ phiên'], ['7_DAYS', '7 ngày'], ['30_DAYS', '30 ngày'], ['MANUAL', 'Tự xóa']] as const).map(([value, label]) =>
        <PrimaryButton key={value} label={`${retention === value ? '✓ ' : ''}${label}`} variant="secondary" disabled={busy || saved} onPress={() => setRetention(value)} />)}
    </View>
    {retention !== 'SESSION' ? <PrimaryButton label={saved ? 'Đã lưu tại máy' : 'Lưu bản sao âm thanh tại máy'} disabled={busy || saved || !durationMs || !state.uri} onPress={saveRecording} /> : null}
    <PrimaryButton label="Thư viện bản ghi tại máy" variant="ghost" disabled={busy} onPress={() => router.push('/speaking/recordings' as Href)} />
    {state.notice || playback.error ? <Text accessibilityLiveRegion="polite" style={{ color: theme.error }}>{state.notice ?? 'Chưa phát được bản ghi.'}</Text> : null}
  </View>;
}
