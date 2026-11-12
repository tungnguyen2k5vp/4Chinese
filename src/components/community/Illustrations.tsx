import { useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';

import { notice } from '../../../assets/community/SOURCES.json';

import { communityArt } from './art';

import { PrimaryButton } from '@/components/PrimaryButton';
import { MotionPressable } from '@/components/ui/MotionPressable';
import { avatarGroups, avatarOptions, stickerPacks, stickers, type CommunitySticker, type StickerPack } from '@/services/community/catalog';
import { useTheme } from '@/theme/ThemeProvider';

export function AvatarGlyph({ index, size = 32 }: { index: number; size?: number }) {
  const option = avatarOptions[index] ?? avatarOptions[0]!;
  return <Image source={communityArt[option.art]} resizeMode="contain" style={{ width: size, height: size }} accessibilityIgnoresInvertColors />;
}

export function AvatarPicker({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (id: number) => void }) {
  const t = useTheme(), [group, setGroup] = useState<string>('Tất cả'), [expanded, setExpanded] = useState(false);
  const choices = avatarOptions.filter(a => group === 'Tất cả' || a.group === group), shown = expanded ? choices : choices.slice(0, 12);
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><AvatarGlyph index={value} size={54} /><View style={{ flex: 1, gap: 4 }}><Text style={{ color: t.textPrimary, fontWeight: '700' }}>{avatarOptions[value]?.label}</Text><Text style={{ color: t.textMuted, fontSize: 12 }}>60 biểu tượng · chọn phong cách của bạn</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{avatarGroups.map(g => <MotionPressable key={g} disabled={disabled} accessibilityLabel={`Nhóm avatar ${g}`} accessibilityState={{ selected: group === g }} onPress={() => { setGroup(g); setExpanded(false); }} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: group === g ? t.primarySoft : t.background, justifyContent: 'center' }}><Text style={{ color: group === g ? t.primaryText : t.textSecondary, fontSize: 13 }}>{g}</Text></MotionPressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{shown.map(a => <MotionPressable key={a.id} disabled={disabled} accessibilityLabel={`Ảnh đại diện ${a.emoji}`} accessibilityState={{ selected: value === a.id }} onPress={() => onChange(a.id)} style={{ width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 2, borderColor: value === a.id ? t.primary : 'transparent', backgroundColor: value === a.id ? t.primarySoft : t.background }}><AvatarGlyph index={a.id} size={37} /></MotionPressable>)}</View>
    {choices.length > 12 ? <PrimaryButton variant="ghost" disabled={disabled} label={expanded ? 'Thu gọn biểu tượng' : `Xem đủ ${choices.length} biểu tượng`} onPress={() => setExpanded(v => !v)} /> : null}
  </View>;
}

export function StickerArtwork({ sticker, compact = false }: { sticker: CommunitySticker; compact?: boolean }) {
  const t = useTheme();
  return <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', gap: 5, padding: compact ? 8 : 12, borderRadius: 17, backgroundColor: t.mode === 'dark' ? '#EAF4F0' : '#F0F7F4' }}>
    <Image source={communityArt[sticker.art]} resizeMode="contain" style={{ width: compact ? 58 : 94, height: compact ? 58 : 94 }} accessibilityIgnoresInvertColors />
    <Text numberOfLines={2} style={{ color: '#173F39', textAlign: 'center', fontWeight: '800', fontSize: compact ? 17 : 21, lineHeight: compact ? 24 : 28 }}>{sticker.chinese}</Text>
    <Text numberOfLines={compact ? 2 : undefined} style={{ color: '#526B65', textAlign: 'center', fontSize: 11, lineHeight: 16 }}>{sticker.meaning}</Text>
  </View>;
}
export function StickerList({ ids, compact = false }: { ids: string[]; compact?: boolean }) {
  const found = ids.flatMap(id => { const s = stickers.find(s => s.id === id); return s ? [s] : []; });
  return found.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(compact ? found.slice(0, 2) : found).map(s => <View key={s.id} accessibilityLabel={`${s.chinese} · ${s.meaning}`} style={{ width: '47%', maxWidth: compact ? 156 : 240 }}><StickerArtwork sticker={s} compact={compact} /></View>)}</View> : null;
}
export function StickerPicker({ value, disabled, onChange }: { value: string[]; disabled: boolean; onChange: (ids: string[]) => void }) {
  const t = useTheme(), [open, setOpen] = useState(false), [pack, setPack] = useState<StickerPack>('hello'), [license, setLicense] = useState(false);
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><View style={{ flex: 1, gap: 3 }}><Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: 18 }}>Hình ảnh biểu cảm</Text><Text style={{ color: t.textMuted, fontSize: 12 }}>72 ảnh · 6 bộ · chọn tối đa 4</Text></View><PrimaryButton label={open ? 'Đóng kho ảnh' : 'Chọn ảnh vui'} variant="secondary" disabled={disabled} onPress={() => setOpen(v => !v)} /></View>
    {!open && !value.length ? <View style={{ flexDirection: 'row', gap: 7 }}>{[stickers[0]!, stickers[13]!, stickers[48]!].map(s => <MotionPressable key={s.id} disabled={disabled} accessibilityLabel={`Chọn ảnh biểu cảm ${s.chinese}`} onPress={() => onChange([s.id])} style={{ flex: 1 }}><StickerArtwork sticker={s} compact /></MotionPressable>)}</View> : null}
    {value.length ? <View style={{ gap: 6 }}><StickerList ids={value} compact /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{value.map(id => { const s = stickers.find(s => s.id === id)!; return <MotionPressable key={id} disabled={disabled} accessibilityLabel={`Bỏ ảnh biểu cảm ${s.chinese}`} onPress={() => onChange(value.filter(v => v !== id))} style={{ minHeight: 44, paddingHorizontal: 10, borderRadius: 12, backgroundColor: t.primarySoft, justifyContent: 'center' }}><Text style={{ color: t.primaryText, fontSize: 12 }}>{s.chinese} ×</Text></MotionPressable>; })}</View></View> : null}
    {open ? <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{Object.entries(stickerPacks).map(([key, label]) => <MotionPressable key={key} disabled={disabled} accessibilityLabel={`Bộ ảnh ${label}`} accessibilityState={{ selected: pack === key }} onPress={() => setPack(key as StickerPack)} style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: pack === key ? t.primarySoft : t.background, justifyContent: 'center' }}><Text style={{ color: pack === key ? t.primaryText : t.textSecondary, fontSize: 13 }}>{label}</Text></MotionPressable>)}</ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{stickers.filter(s => s.pack === pack).map(s => { const selected = value.includes(s.id); return <MotionPressable key={s.id} accessibilityLabel={`Chọn ảnh biểu cảm ${s.chinese}`} accessibilityState={{ selected }} disabled={disabled || (!selected && value.length >= 4)} onPress={() => onChange(selected ? value.filter(v => v !== s.id) : [...value, s.id])} style={{ width: '30.5%', flexGrow: 1, maxWidth: '32%', padding: 2, borderWidth: 2, borderColor: selected ? t.primary : 'transparent', borderRadius: 20, opacity: !selected && value.length >= 4 ? 0.45 : 1 }}><StickerArtwork sticker={s} compact /></MotionPressable>; })}</View>
      <Text style={{ color: t.textMuted, fontSize: 11, lineHeight: 16 }}>Hình: Microsoft Fluent Emoji · MIT. Câu và nghĩa Việt do 4Chinese biên soạn.</Text>
      <PrimaryButton label={license ? 'Ẩn giấy phép hình ảnh' : 'Giấy phép hình ảnh'} variant="ghost" onPress={() => setLicense(v => !v)} />
      {license ? <Text selectable style={{ color: t.textSecondary, fontSize: 11, lineHeight: 17 }}>{notice}</Text> : null}
    </> : null}
  </View>;
}
