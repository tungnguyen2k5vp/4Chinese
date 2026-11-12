import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { stopChineseSpeech } from '@/services/audio/chinese-speech';

/** A question's audio must not spill into the next question or another screen. */
export function usePracticeSpeech(turn: string | number) {
  const stop = useCallback(() => { void stopChineseSpeech().catch(() => undefined); }, []);
  useEffect(() => stop, [stop, turn]);
  useFocusEffect(useCallback(() => stop, [stop]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') stop(); });
    return () => sub.remove();
  }, [stop]);
}
