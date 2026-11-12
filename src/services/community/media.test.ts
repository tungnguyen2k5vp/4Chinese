import { describe, expect, it, vi } from 'vitest';

import { validateMedia } from './media';
import { presenceLabel } from './presence';

vi.mock('expo-document-picker', () => ({}));
vi.mock('expo-image-picker', () => ({}));
vi.mock('expo-file-system', () => ({}));
vi.mock('expo-sharing', () => ({}));
vi.mock('expo-web-browser', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('@/services/cloud/client', () => ({ getCommunityClient: () => null }));

describe('social file boundary', () => {
  it('accepts supported Unicode names and the exact size ceilings', () => {
    expect(validateMedia('bài học.pdf', 'application/pdf', 10 * 1048576)).toBe('application/pdf');
    expect(validateMedia('你好.png', 'image/png', 8 * 1048576)).toBe('image/png');
    expect(validateMedia('video.mp4', 'video/mp4', 25 * 1048576)).toBe('video/mp4');
    expect(validateMedia('lesson.docx', 'application/octet-stream', 30)).toContain('wordprocessingml');
  });
  it('rejects active formats, spoofed MIME, unsafe paths and invalid sizes', () => {
    for (const [name, mime, size] of [
      ['test.svg', 'image/svg+xml', 20], ['test.html', 'text/html', 20], ['../test.pdf', 'application/pdf', 20],
      ['test.png', 'text/plain', 20], ['test.png', 'image/png', 8 * 1048576 + 1],
      ['test.pdf', 'application/pdf', 10 * 1048576 + 1], ['test.mp4', 'video/mp4', 25 * 1048576 + 1],
      ['test.txt', 'text/plain', 0], ['test.txt', 'text/plain', NaN], ['test.txt', 'text/plain', 1.5],
    ] as [string, string, number][]) expect(() => validateMedia(name, mime, size)).toThrow('SOCIAL_MEDIA_INVALID');
  });
});
describe('honest friend activity', () => {
  it('does not present stale or unavailable status as online', () => {
    const now = Date.parse('2026-11-06T00:02:00Z'), person = { id: 'peer', online: true, seen_at: '2026-11-06T00:01:00Z' };
    expect(presenceLabel(person, now, now)).toBe('Đang hoạt động');
    expect(presenceLabel(person, now - 30000, now)).toContain('phút trước');
    expect(presenceLabel(person, now - 71000, now)).toContain('Chưa có');
    expect(presenceLabel(undefined, now, now)).toContain('Chưa có');
  });
});
