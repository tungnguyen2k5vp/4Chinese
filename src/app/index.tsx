import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/design';
import { getSettings } from '@/db/repository';

export default function Index() {
  const db = useSQLiteContext();
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => { getSettings(db).then((settings) => setReady(settings.onboardingCompleted)); }, [db]);
  if (ready === null) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  return <Redirect href={ready ? '/(tabs)' : '/onboarding'} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });
