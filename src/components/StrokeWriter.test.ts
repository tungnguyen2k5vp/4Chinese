import { createRequire } from 'node:module';

import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { StrokeWriter } from './StrokeWriter';
import { WritingCanvas } from './WritingCanvas';

const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: ReactNode) => string;
};

// Native views are shimmed; the real components render against the actual bundled paths.
vi.mock('expo-router', () => ({ useIsFocused: () => true }));
vi.mock('react-native', () => ({
  useWindowDimensions: () => ({ width: 375, height: 812, scale: 1, fontScale: 1 }),
  StyleSheet: { create: (value: unknown) => value },
  PanResponder: { create: () => ({ panHandlers: {} }) },
  View: ({ children, accessibilityLabel }: { children: ReactNode; accessibilityLabel?: string }) =>
    createElement('div', { 'aria-label': accessibilityLabel }, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Text: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  Pressable: ({ children, disabled, accessibilityLabel }: { children: ReactNode; disabled?: boolean; accessibilityLabel?: string }) =>
    createElement('button', { disabled, 'aria-label': accessibilityLabel }, children),
}));
vi.mock('react-native-svg', () => ({
  default: ({ children }: { children: ReactNode }) => createElement('svg', null, children),
  G: ({ children }: { children: ReactNode }) => createElement('g', null, children),
  Line: () => createElement('line'),
  Path: ({ d }: { d: string }) => createElement('path', { d }),
  Polyline: () => createElement('polyline'),
  Text: ({ children }: { children: ReactNode }) => createElement('text', null, children),
}));
// Vitest does not resolve Metro's CommonJS @ aliases inside the lazy JSON reader.
// Load the same real corpus here; source/shard equality is covered in stroke-hints.test.ts.
vi.mock('@/services/handwriting/stroke-data', async () => {
  const { default: data } = await import('@/data/hsk12-strokes.json');
  const paths = data as Record<string, string[]>;
  return { getStrokePaths: (character: string) => paths[character] ?? [] };
});
vi.mock('@/theme/ThemeProvider', () => ({
  useTheme: () => ({ border: '#666', primary: '#2457D6', textMuted: '#666', textSecondary: '#333', primarySoft: '#eee', primaryText: '#123' }),
}));

describe('missing exact-character stroke UX (headless native-view shims)', () => {
  it.each(['搾', '獃', '秊', '薙', '颿', '骽'])('shows font-only fallback for %s with no fabricated paths or replay', character => {
    const html = renderToStaticMarkup(createElement(StrokeWriter, { character }));
    expect(html).toContain(`Hình chữ ${character} từ phông chữ`);
    expect(html).toContain(`Chưa có dữ liệu thứ tự nét ngoại tuyến cho chữ ${character}`);
    expect(html).toContain('không hướng dẫn thứ tự nét');
    expect(html).toContain('không thay bằng nét của chữ khác');
    expect(html).toContain(`<text>${character}</text>`);
    expect(html).not.toContain('<path');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('đang hiện 0 trên 0 nét');
  });
  it.each(['搾', '獃', '秊', '薙', '颿', '骽'])('keeps free writing for %s and disables path tracing', character => {
    const html = renderToStaticMarkup(createElement(WritingCanvas, { character }));
    expect(html).toContain('Tự viết');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Tô theo nét mẫu"/u);
    expect(html).toContain('Chưa có mẫu nét chính xác ngoại tuyến');
    expect(html).toContain('Gợi ý hình');
    expect(html).not.toContain('<path');
  });
  it('retains actual supported-character paths and replay controls', () => {
    const html = renderToStaticMarkup(createElement(StrokeWriter, { character: '年' }));
    expect(html).toContain('Mẫu thứ tự nét của chữ 年');
    expect(html).toContain('<path');
    expect(html).toContain('Phát lại thứ tự nét');
    expect(html).toContain('Tốc độ nét viết 0.5 lần');
    expect(html).toContain('Tốc độ nét viết 1.5 lần');
    expect(html).toContain('Hiện nét mờ gợi ý');
    expect(html).not.toContain('Hình chữ 年 từ phông chữ');
  });
});
