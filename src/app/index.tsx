import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getSettings } from '@/db/repository';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

export default function Index() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => { getSettings(db).then((settings) => setReady(settings.onboardingCompleted)); }, [db]);
  if (ready === null) return <View style={styles.loading}><ActivityIndicator size="large" color={theme.primaryText} /></View>;
  return <Redirect href={ready ? '/(tabs)' : '/onboarding'} />;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background } }); }
