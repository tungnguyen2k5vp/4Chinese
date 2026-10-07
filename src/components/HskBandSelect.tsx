import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { HskBand } from '@/types/models';

export const hskBandOptions: (HskBand | 'all')[] = ['all', 1, 2, 3, 4, 5, 6, '7-9'];
export function HskBandSelect({ value, onChange, allowAll = true, disabled = false }: {
  value: HskBand | 'all'; onChange: (value: HskBand | 'all') => void; allowAll?: boolean; disabled?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const label = value === 'all' ? 'Tất cả cấp HSK' : `HSK ${value}`;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Chọn cấp độ: ${label}`} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={{ minHeight: 48, padding: 12, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{label}</Text><Ionicons name="chevron-down" size={20} color={theme.primaryText} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: theme.overlay }}>
        <Pressable accessibilityLabel="Đóng bộ chọn cấp độ" onPress={() => setOpen(false)} style={{ flex: 1 }} />
        <View style={{ backgroundColor: theme.surface, padding: 20, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: theme.textPrimary, fontWeight: '800', fontSize: 20 }}>Chọn cấp độ HSK</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setOpen(false)} style={{ padding: 12 }}><Ionicons name="close" size={24} color={theme.textPrimary} /></Pressable></View>
          <ScrollView>{hskBandOptions.filter(band => allowAll || band !== 'all').map(band => <Pressable key={band} accessibilityRole="radio" accessibilityState={{ checked: value === band }} onPress={() => { onChange(band); setOpen(false); }} style={{ minHeight: 48, padding: 14, borderRadius: 12, marginTop: 6, backgroundColor: value === band ? theme.primarySoft : theme.surface, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{band === 'all' ? 'Tất cả cấp HSK' : `HSK ${band}`}</Text>{value === band ? <Ionicons name="checkmark" size={20} color={theme.primaryText} /> : null}
          </Pressable>)}</ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
