import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { expect, it } from 'vitest';

import { avatarOptions, legacyTopics, stickerPacks, stickers, topics } from './catalog';

it('ships stable catalog IDs with intact, licensed local artwork for every choice', () => {
  expect(avatarOptions).toHaveLength(60);
  expect(avatarOptions.slice(0, 6).map(a => a.emoji)).toEqual(['🌱', '🐼', '🦊', '🐳', '🌻', '🐈']);
  expect(stickers).toHaveLength(72);
  expect(new Set(stickers.map(s => s.id)).size).toBe(72);
  for (const pack of Object.keys(stickerPacks)) expect(stickers.filter(s => s.pack === pack)).toHaveLength(12);
  expect(Object.keys(topics)).toHaveLength(19);
  expect(legacyTopics.every(topic => topic in topics)).toBe(true);
  const source = JSON.parse(readFileSync('assets/community/SOURCES.json', 'utf8')) as { license: string; notice: string; files: { key: string; sha256: string }[] };
  expect(source.license).toBe('MIT');
  const artwork = readFileSync('src/components/community/art.ts', 'utf8');
  for (const key of new Set([...avatarOptions, ...stickers].map(a => a.art))) {
    const file = source.files.find(f => f.key === key)!;
    expect(file, key).toBeDefined();
    expect(createHash('sha256').update(readFileSync(`assets/community/${key}.png`)).digest('hex')).toBe(file.sha256);
    expect(artwork).toContain(`/${key}.png`);
  }
  expect(source.notice).toEqual(readFileSync('assets/community/LICENSE.microsoft-fluent-emoji.txt', 'utf8'));
});
