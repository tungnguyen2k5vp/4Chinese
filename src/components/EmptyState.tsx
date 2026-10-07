import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyIllustration, type EmptyScene } from '@/components/visual/EmptyIllustration';
import { spacing } from '@/constants/design';
import { useTheme, useThemeStyles } from '@/theme/ThemeProvider';

type EmptyVariant = 'general' | keyof ReturnType<typeof useTheme>['skillColors'];
type EmptyAction = { label: string; onPress: () => void; disabled?: boolean };

export function EmptyState({ title, message, variant = 'general', scene, primaryAction, secondaryAction }: {
  icon?: string; title: string; message: string; variant?: EmptyVariant; scene?: EmptyScene; primaryAction?: EmptyAction; secondaryAction?: EmptyAction;
}) {
  const styles = useThemeStyles(createStyles);
  const illustrationScene = scene ?? (variant === 'review' ? 'review' : variant === 'listening' || variant === 'speaking' ? 'recordings' : variant === 'reading' ? 'stories' : variant === 'vocabulary' ? 'deck' : 'search');
  return <View style={styles.container}>
    <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <EmptyIllustration scene={illustrationScene} />
    </View>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {primaryAction || secondaryAction ? <View style={styles.actions}>
      {primaryAction ? <PrimaryButton label={primaryAction.label} onPress={primaryAction.onPress} disabled={primaryAction.disabled} /> : null}
      {secondaryAction ? <PrimaryButton label={secondaryAction.label} variant="secondary" onPress={secondaryAction.onPress} disabled={secondaryAction.disabled} /> : null}
    </View> : null}
  </View>;
}

function createStyles(theme: ReturnType<typeof useTheme>) { return StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  mark: { minWidth: 144, minHeight: 112, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, marginBottom: spacing.xs, overflow: 'hidden' },
  title: { color: theme.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  message: { color: theme.textSecondary, textAlign: 'center', lineHeight: 22 }, actions: { alignSelf: 'stretch', maxWidth: 320, width: '100%', gap: spacing.sm, marginTop: spacing.sm },
}); }
