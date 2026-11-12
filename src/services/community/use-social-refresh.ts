import { useFocusEffect } from 'expo-router';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { socialError, watchSocial } from './api';

/** Subscribe only while visible; socket reconnect and foreground both replay durable state. */
export function useSocialRefresh(tables: string[], load: () => Promise<void>) {
  const latest = useRef(load);
  useLayoutEffect(() => { latest.current = load; });
  const runner = useRef<() => Promise<void>>(async () => {});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tableKey = tables.join(',');
  useFocusEffect(useCallback(() => {
    let disposed = false, running = false, again = false;
    let stop: (() => void) | undefined, generation = 0;
    const refresh = async () => {
      if (disposed || (AppState.currentState != null && AppState.currentState !== 'active')) return;
      if (running) { again = true; return; }
      running = true; setLoading(true);
      do {
        again = false;
        try { await latest.current(); if (!disposed) setError(''); }
        catch (e) { if (!disposed) setError(socialError(e)); }
      } while (again && !disposed);
      running = false; if (!disposed) setLoading(false);
    };
    runner.current = refresh;
    const start = () => {
      const id = ++generation;
      stop?.(); stop = undefined;
      void refresh();
      void watchSocial(tableKey.split(','), () => { void refresh(); }, value => {
        if (!disposed && id === generation) setConnected(value);
      }).then(cleanup => { if (disposed || id !== generation) cleanup(); else stop = cleanup; })
        .catch(e => { if (!disposed) setError(socialError(e)); });
    };
    start();
    const appState = AppState.addEventListener('change', value => {
      if (value === 'active') start();
      else { ++generation; stop?.(); stop = undefined; setConnected(false); }
    });
    // RLS can suppress tombstone/block events. Reconcile even while the socket is connected.
    const fallback = setInterval(() => { void refresh(); }, 30000);
    return () => { disposed = true; ++generation; stop?.(); appState.remove(); clearInterval(fallback); runner.current = async () => {}; };
  }, [tableKey]));
  return { connected, error, loading, refresh: useCallback(() => runner.current(), []) };
}
