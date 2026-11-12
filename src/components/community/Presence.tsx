import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Text } from 'react-native';

import { getCommunityClient } from '@/services/cloud/client';
import { newOperationId } from '@/services/community/api';
import { friendPresence, pingPresence, presenceLabel, type FriendPresence } from '@/services/community/presence';
import { useTheme } from '@/theme/ThemeProvider';

/** No guest creation: publish only an existing account while the app is visible. */
export function CommunityPresence() {
  useEffect(() => {
    const client = getCommunityClient(); if (!client) return;
    let user = '', active = AppState.currentState == null || AppState.currentState === 'active', stopped = false, device = newOperationId();
    const ping = () => {
      if (user && active && !stopped) void pingPresence(device).catch(() => {});
    };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (user !== (session?.user.id ?? '')) device = newOperationId();
      user = session?.user.id ?? ''; ping();
    });
    void client.auth.getSession().then(({ data }) => { if (!stopped) { user = data.session?.user.id ?? ''; ping(); } });
    const listener = AppState.addEventListener('change', state => {
      active = state === 'active';
      if (active) ping(); else if (user) void pingPresence(device, true).catch(() => {});
    });
    const timer = setInterval(ping, 25000);
    return () => { stopped = true; clearInterval(timer); listener.remove(); subscription.unsubscribe(); };
  }, []);
  return null;
}
export function useFriendPresence(ids: string[]) {
  const key = [...new Set(ids)].sort().join(','), [state, setState] = useState<{ values: FriendPresence[]; at: number }>({ values: [], at: 0 });
  useFocusEffect(useCallback(() => {
    let live = true, busy = false;
    const refresh = async () => {
      if (!live || busy || (AppState.currentState != null && AppState.currentState !== 'active')) return;
      if (!key) { setState({ values: [], at: 0 }); return; }
      busy = true;
      try {
        const values: FriendPresence[] = [], wanted = key.split(',');
        for (let i = 0; i < wanted.length; i += 200) values.push(...await friendPresence(wanted.slice(i, i + 200)));
        if (live) setState({ values, at: Date.now() });
      } catch { if (live) setState({ values: [], at: 0 }); }
      finally { busy = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 15000);
    const listener = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); else setState({ values: [], at: 0 }); });
    return () => { live = false; clearInterval(timer); listener.remove(); };
  }, [key]));
  return (id: string) => ({ value: state.values.find(v => v.id === id), at: state.at });
}
export function PresenceLabel({ status }: { status: { value?: FriendPresence; at: number } }) {
  const t = useTheme(), label = presenceLabel(status.value, status.at);
  return <Text accessibilityLiveRegion="polite" style={{ color: label === 'Đang hoạt động' ? t.primaryText : t.textMuted, fontSize: 12, lineHeight: 18 }}>{label === 'Đang hoạt động' ? '● ' : ''}{label}</Text>;
}
