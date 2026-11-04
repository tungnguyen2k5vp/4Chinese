import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { QuickSessionClock, type QuickSessionSnapshot } from '@/services/learning/quick-session-clock';

const idle: QuickSessionSnapshot = { elapsedSeconds: 0, remainingSeconds: 0, expired: false };

export function useQuickSessionClock(minutes: 3 | 5 | 10 | null) {
  const focused = useIsFocused();
  const clock = useMemo(() => minutes == null ? null : new QuickSessionClock(minutes * 60), [minutes]);
  const [snapshot, setSnapshot] = useState<QuickSessionSnapshot>(idle);
  const read = useCallback(() => clock?.snapshot() ?? idle, [clock]);

  useEffect(() => {
    if (!clock) return;
    const refresh = () => {
      const next = clock.snapshot();
      setSnapshot(previous => previous.elapsedSeconds === next.elapsedSeconds && previous.remainingSeconds === next.remainingSeconds && previous.expired === next.expired ? previous : next);
    };
    clock.setActive(focused && AppState.currentState === 'active');
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      clock.setActive(focused && state === 'active');
      refresh();
    });
    const timer = setInterval(refresh, 250);
    return () => {
      clock.setActive(false);
      clearInterval(timer);
      subscription.remove();
    };
  }, [clock, focused]);

  return { ...snapshot, read };
}
