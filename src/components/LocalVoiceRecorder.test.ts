import { createRequire } from 'node:module';

import { createElement, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LocalVoiceRecorder, RecorderCompletion } from './LocalVoiceRecorder';

import TimedSpeaking from '@/app/exam/speaking';
import RecordingsScreen from '@/app/speaking/recordings';
import { LocalRecording, type RecordingAdapter } from '@/services/speaking/local-recording';

// Use the installed SSR runtime without adding a typings/package dependency.
const { renderToStaticMarkup } = createRequire(import.meta.url)('react-dom/server') as {
  renderToStaticMarkup: (node: ReactNode) => string;
};

// Native module boundaries only; lifecycle and completion logic below are real.
vi.mock('expo-audio', () => ({
  RecordingPresets: { HIGH_QUALITY: {} },
  useAudioRecorder: () => ({ prepareToRecordAsync: vi.fn(), record: vi.fn(), stop: vi.fn(), uri: null }),
  useAudioRecorderState: () => ({ durationMillis: 0 }),
  useAudioPlayer: () => ({ pause: vi.fn(), replace: vi.fn(), play: vi.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, didJustFinish: false, error: null }),
}));
vi.mock('expo-file-system', () => ({}));
vi.mock('expo-router', () => ({ useFocusEffect: () => {} }));
vi.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }));
vi.mock('react-native-svg', () => ({ default: () => null, Svg: () => null, Circle: () => null, Path: () => null, Rect: () => null }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null, AntDesign: () => null }));
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  Text: ({ children }: { children: ReactNode }) => createElement('span', null, children),
  View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Modal: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  ScrollView: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  Pressable: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => createElement('button', { disabled }, children),
  ActivityIndicator: () => createElement('span', null, 'loading'),
  TextInput: () => createElement('input'),
  AppState: { addEventListener: () => ({ remove: () => {} }) },
}));
vi.mock('./PrimaryButton', () => ({ PrimaryButton: ({ label, disabled, loading }: { label: string; disabled?: boolean; loading?: boolean }) =>
  createElement('button', { disabled: disabled || loading }, label) }));
vi.mock('./Screen', () => ({ Screen: ({ title, children }: { title: string; children: ReactNode }) => createElement('main', null, title, children) }));
vi.mock('@/services/audio/chinese-speech', () => ({}));
vi.mock('@/theme/ThemeProvider', () => ({ useTheme: () => ({ textMuted: '#666', textPrimary: '#111', primary: '#123', onPrimary: '#fff', surface: '#fff' }) }));

function fixture() {
  const completion = new RecorderCompletion(30000);
  const callback = vi.fn<(durationMs: number) => void>();
  const adapter: RecordingAdapter = {
    permission: vi.fn(async () => true), mode: vi.fn(async () => {}), prepare: vi.fn(async () => {}),
    record: vi.fn(() => completion.begin()), stop: vi.fn(async () => completion.stopped(2450, 0)),
    uri: vi.fn(() => 'file://temporary.m4a'), remove: vi.fn(),
  };
  const recording = new LocalRecording(adapter, (state) => {
    if (state.phase === 'ready' && state.uri && !state.notice) completion.complete(callback);
    if (state.phase === 'idle') completion.cancel();
  });
  recording.activate();
  return { completion, callback, adapter, recording };
}
afterEach(() => { vi.useRealTimers(); Platform.OS = 'web'; });

describe('headless speaking screen checkpoint (native views shimmed)', () => {
  it('recording library web fallback explains local native-only storage with no playback controls', () => {
    const html = renderToStaticMarkup(createElement(RecordingsScreen));
    expect(html).toContain('Android/iOS'); expect(html).toContain('không đồng bộ lên web hoặc sao lưu JSON của app');
    expect(html).not.toContain('Nghe bản ghi'); expect(html).not.toContain('Xóa bản ghi này');
  });
  it('native recorder defaults to session-only with explicit retention options and no automatic save', () => {
    Platform.OS = 'android';
    const html = renderToStaticMarkup(createElement(LocalVoiceRecorder));
    expect(html).toContain('✓ Chỉ phiên');
    for (const label of ['7 ngày', '30 ngày', 'Tự xóa', 'Thư viện bản ghi tại máy']) expect(html).toContain(label);
    expect(html).not.toContain('Lưu bản sao âm thanh tại máy');
    expect(html).toContain('không tự lưu');
  });
  it('web explains native-only recording and cannot save an unrecorded practice', () => {
    const html = renderToStaticMarkup(createElement(TimedSpeaking));
    expect(html).toContain('Ghi âm hiện chỉ hỗ trợ');
    expect(html).toContain('chỉ trong phiên (mặc định)');
    expect(html).toContain('chưa hỗ trợ');
    expect(html).toContain('Lịch sử thông tin lượt nói');
    expect(html).not.toContain('Lưu thông tin lượt nói (không âm thanh)');
    expect(html).not.toContain('Bắt đầu thời gian chuẩn bị');
    expect(html).not.toContain('<input');
  });
  it('native initial screen requires preparation and exposes no save or transcript form yet', () => {
    Platform.OS = 'android';
    const html = renderToStaticMarkup(createElement(TimedSpeaking));
    expect(html).toContain('Bắt đầu thời gian chuẩn bị');
    expect(html).not.toContain('Lưu thông tin lượt nói (không âm thanh)');
    expect(html).not.toContain('<input');
  });
});

describe('duration-only recorder completion', () => {
  it('reports positive native duration once, including when stop resets status', () => {
    const completion = new RecorderCompletion(30000);
    const callback = vi.fn();
    completion.begin(); completion.stopped(2450.4, 0);
    completion.complete(callback); completion.complete(callback);
    expect(callback.mock.calls).toEqual([[2450]]);
    completion.begin(); completion.stopped(0, 812.6); completion.complete(callback);
    expect(callback.mock.calls.at(-1)).toEqual([813]);
  });
  it('does not report unknown/zero duration, a stopped but never started mic, or cancellation', () => {
    const completion = new RecorderCompletion(30000);
    const callback = vi.fn();
    completion.stopped(2000, 2000); completion.complete(callback);
    completion.begin(); completion.stopped(NaN, 0); completion.complete(callback);
    completion.begin(); completion.stopped(1000, 1000); completion.cancel(); completion.complete(callback);
    completion.stopped(1000, 1000); completion.complete(callback);
    expect(callback).not.toHaveBeenCalled();
  });
  it('bounds a slightly late native stop at the configured maximum', () => {
    const completion = new RecorderCompletion(120000);
    const callback = vi.fn();
    completion.begin(); completion.stopped(120010, Infinity); completion.complete(callback);
    expect(callback.mock.calls).toEqual([[120000]]);
  });
  it('denied microphone never completes or leaks a URI through the callback', async () => {
    const { callback, adapter, recording } = fixture();
    adapter.permission = vi.fn(async () => false);
    await recording.start(); await recording.stop(); await recording.cancel();
    expect(callback).not.toHaveBeenCalled();
    expect(adapter.record).not.toHaveBeenCalled();
  });
  it('completed recording delivers only duration and still deletes temporary audio on exit', async () => {
    const { callback, adapter, recording } = fixture();
    await recording.start(); await recording.stop(); await recording.stop();
    expect(callback.mock.calls).toEqual([[2450]]);
    await recording.cancel();
    expect(adapter.remove).toHaveBeenCalledWith('file://temporary.m4a');
    expect(callback.mock.calls).toEqual([[2450]]);
  });
  it('cancellation during permission and foreground resume cannot complete a cancelled recording', async () => {
    const { callback, adapter, recording, completion } = fixture();
    let resolve!: (granted: boolean) => void;
    adapter.permission = () => new Promise<boolean>((done) => { resolve = done; });
    const start = recording.start();
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'));
    completion.cancel();
    const cancel = recording.cancel();
    recording.activate();
    resolve(true);
    await Promise.all([start, cancel]);
    expect(adapter.record).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    adapter.permission = async () => true;
    await recording.start(); await recording.stop();
    expect(callback.mock.calls).toEqual([[2450]]);
    await recording.cancel();
  });
  it.each(['resolve', 'reject'] as const)('quick foreground during a pending %s save stays active and preserves source until settlement', async (settlement) => {
    const { callback, adapter, recording, completion } = fixture();
    await recording.start(); await recording.stop();
    vi.mocked(adapter.remove).mockClear();
    let settle!: () => void;
    const save = new Promise<void>((resolve, reject) => { settle = () => settlement === 'resolve' ? resolve() : reject(new Error('copy failed')); });
    completion.cancel();
    // Exact component integration: invalidation is immediate, not after awaiting save.
    const cleanup = recording.cancel(save);
    await recording.start(); // Background cannot start another microphone.
    expect(adapter.record).toHaveBeenCalledTimes(1);
    recording.activate(); // Foreground arrives before the copy settles.
    const restart = recording.start();
    await Promise.resolve();
    expect(adapter.remove).not.toHaveBeenCalled();
    expect(adapter.record).toHaveBeenCalledTimes(1);
    settle(); await Promise.all([cleanup, restart]);
    expect(adapter.remove).toHaveBeenCalledWith('file://temporary.m4a');
    expect(adapter.record).toHaveBeenCalledTimes(2);
    await recording.stop();
    expect(callback.mock.calls).toEqual([[2450], [2450]]);
    // Delayed cleanup did not deactivate the resumed recorder.
    await recording.start(); await recording.stop();
    expect(adapter.record).toHaveBeenCalledTimes(3);
    await recording.cancel();
  });
  it('native stop failure never completes and still cleans up', async () => {
    const { callback, adapter, recording } = fixture();
    adapter.stop = vi.fn(async () => { throw new Error('interruption'); });
    await recording.start(); await recording.stop(); await recording.cancel();
    expect(callback).not.toHaveBeenCalled();
    expect(adapter.remove).toHaveBeenCalledWith('file://temporary.m4a');
  });
  it('duration limit completes once and clears timers on cancellation', async () => {
    vi.useFakeTimers();
    const { callback, recording } = fixture();
    await recording.start(); await vi.advanceTimersByTimeAsync(30000);
    expect(callback.mock.calls).toEqual([[2450]]);
    await recording.cancel();
    expect(vi.getTimerCount()).toBe(0);
  });
});
