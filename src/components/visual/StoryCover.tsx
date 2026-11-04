import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { radius } from '@/constants/design';
import { useTheme } from '@/theme/ThemeProvider';

const storyIcons: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  'story-school-1': 'book-outline',
  'story-new-friend-hsk1': 'people-outline',
  'story-rainy-day-hsk1': 'umbrella-outline',
  'story-fruit-shop-hsk1': 'nutrition-outline',
  'story-family-dinner-hsk1': 'restaurant-outline',
  'story-lost-pencil-hsk1': 'pencil-outline',
  'story-weekend-2': 'walk-outline',
  'story-birthday-hsk2': 'gift-outline',
  'story-wrong-bus-hsk2': 'bus-outline',
  'story-library-book-hsk2': 'library-outline',
  'story-learn-swimming-hsk2': 'water-outline',
  'story-supermarket-list-hsk2': 'cart-outline',
  'story-letter-3': 'mail-outline',
  'story-train-visit-hsk3': 'train-outline',
  'story-old-photo-hsk3': 'images-outline',
  'story-lost-dog-hsk3': 'paw-outline',
  'story-message-mixup-hsk3': 'chatbubble-ellipses-outline',
  'story-neighborhood-trees-hsk3': 'leaf-outline',
};

/** Original, lightweight topic art so published stories are distinguishable at a glance. */
export function StoryCover({ storyId, level }: { storyId: string; level: string }) {
  const theme = useTheme();
  const accent = theme.hskByLevel[level as keyof typeof theme.hskByLevel] ?? theme.primary;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.cover, { backgroundColor: theme.mode === 'dark' ? theme.surfaceElevated : theme.primarySoft }]}>
      <View style={[styles.orbit, { borderColor: accent + '55' }]} />
      <View style={[styles.iconDisc, { backgroundColor: theme.surface, borderColor: accent + '55' }]}>
        <Ionicons name={storyIcons[storyId] ?? 'book-outline'} size={31} color={accent} />
      </View>
      <Text style={[styles.stamp, { color: accent, backgroundColor: theme.surface }]}>{storyIcons[storyId] ? '中' : '阅'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1, minHeight: 112, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' },
  orbit: { position: 'absolute', width: 62, height: 62, borderRadius: 31, borderWidth: 2, transform: [{ rotate: '-24deg' }] },
  iconDisc: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1 },
  stamp: { position: 'absolute', right: 5, bottom: 5, minWidth: 22, height: 22, textAlign: 'center', textAlignVertical: 'center', overflow: 'hidden', borderRadius: 11, fontSize: 12, fontWeight: '900' },
});
