import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import { File } from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';

import { colors, spacing } from '@/constants/design';
import { stopChineseSpeech } from '@/services/audio/chinese-speech';
import { LocalRecording, type LocalRecordingState } from '@/services/speaking/local-recording';

export function LocalVoiceRecorder({ onRecordingChange, onReplay, playbackBlocked = false }: {
  onRecordingChange?: (busy: boolean) => void; onReplay?: () => void; playbackBlocked?: boolean;
}) {
  if (Platform.OS === 'web') return <Text style={{ color: colors.textMuted }}>Nghe mẫu trên web; ghi âm đối chiếu hiện hỗ trợ bản Android/iOS.</Text>;
  return <NativeRecorder onRecordingChange={onRecordingChange} onReplay={onReplay} playbackBlocked={playbackBlocked} />;
}

function NativeRecorder({ onRecordingChange, onReplay, playbackBlocked }: {
  onRecordingChange?: (busy: boolean) => void; onReplay?: () => void; playbackBlocked: boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const playback = useAudioPlayerStatus(player);
  const [state, setState] = useState<LocalRecordingState>({ phase: 'idle', uri: null, notice: null });
  const replayGeneration = useRef(0);
  const focused = useRef(false);
  const replayRequested = useRef(false);
  const recording = useMemo(() => new LocalRecording({
    permission: async () => (await requestRecordingPermissionsAsync()).granted,
    mode: async (allowsRecording) => { await setAudioModeAsync({ allowsRecording, playsInSilentMode: true }); },
    prepare: () => recorder.prepareToRecordAsync(), record: () => recorder.record({ forDuration: 30 }),
    stop: () => recorder.stop(), uri: () => recorder.uri,
    remove: (uri) => { const file = new File(uri); if (file.exists) file.delete(); },
  }, setState), [recorder]);
  useEffect(() => { onRecordingChange?.(state.phase === 'busy' || state.phase === 'recording'); }, [onRecordingChange, state.phase]);
  useEffect(() => {
    if (playbackBlocked) { replayGeneration.current++; replayRequested.current = false; player.pause(); }
  }, [playbackBlocked, player]);
  useEffect(() => {
    if (playback.playing && replayRequested.current) { replayRequested.current = false; onReplay?.(); }
  }, [onReplay, playback.playing]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    recording.activate();
    const cancel = () => {
      focused.current = false; replayGeneration.current++; replayRequested.current = false;
      try { player.pause(); player.replace(null); } catch { /* Player already released. */ }
      void recording.cancel();
      setState({ phase: 'idle', uri: null, notice: null });
      onRecordingChange?.(false);
    };
    const listener = AppState.addEventListener('change', (next) => {
      if (next !== 'active') cancel(); else { focused.current = true; recording.activate(); }
    });
    return () => { listener.remove(); cancel(); };
  }, [onRecordingChange, player, recording]));
  const busy = state.phase === 'busy' || state.phase === 'recording';
  const record = async () => {
    replayGeneration.current++; replayRequested.current = false;
    player.pause(); player.replace(null);
    onRecordingChange?.(true);
    await stopChineseSpeech().catch(() => undefined);
    if (state.phase === 'recording') await recording.stop(); else await recording.start();
  };
  return <View style={{ gap: spacing.sm }}>
    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Micro chỉ dùng để nghe lại, tối đa 30 giây. Không gửi lên mạng; bản ghi xóa khi rời màn hình/vào nền hoặc ghi lại.</Text>
    <PrimaryButton label={state.phase === 'recording' ? 'Dừng ghi âm' : 'Ghi âm đối chiếu'} loading={state.phase === 'busy'} onPress={() => void record()} variant={state.phase === 'recording' ? 'danger' : 'secondary'} />
    <PrimaryButton label={playback.playing ? 'Dừng nghe bản ghi' : 'Nghe bản ghi của tôi'} disabled={!state.uri || busy || playbackBlocked}
      variant="ghost" onPress={() => {
        void (async () => {
          const request = ++replayGeneration.current;
          try {
            if (player.playing) { player.pause(); return; }
            await stopChineseSpeech();
            await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
            if (!state.uri || !focused.current || request !== replayGeneration.current) return;
            replayRequested.current = true;
            player.replace({ uri: state.uri }); player.play();
          } catch { setState((current) => ({ ...current, notice: 'Chưa phát được bản ghi. Hãy thử lại.' })); }
        })();
      }} />
    {state.notice || playback.error ? <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>{state.notice ?? 'Chưa phát được bản ghi.'}</Text> : null}
  </View>;
}
