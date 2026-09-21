import { stripPinyinTone } from '@/services/pinyin/pinyin';

export function normalizeSearch(value: string): string {
  return stripPinyinTone(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\u3400-\u9fff]+/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesSearch(fields: string[], query: string): boolean {
  const normalizedQuery = normalizeSearch(query);
  return fields.some((field) => normalizeSearch(field).includes(normalizedQuery));
}
