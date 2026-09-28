// Static, lazy JSON requires avoid parsing the entire stroke corpus at app startup.
const loaders = [
  () => require('@/data/stroke-shard-0.json'),
  () => require('@/data/stroke-shard-1.json'),
  () => require('@/data/stroke-shard-2.json'),
  () => require('@/data/stroke-shard-3.json'),
  () => require('@/data/stroke-shard-4.json'),
  () => require('@/data/stroke-shard-5.json'),
  () => require('@/data/stroke-shard-6.json'),
  () => require('@/data/stroke-shard-7.json'),
];
const cache = new Map<number, Record<string, string[]>>();

export function getStrokePaths(character: string): string[] {
  if (!/^[\u3400-\u9fff]$/u.test(character)) return [];
  const shard = character.charCodeAt(0) % loaders.length;
  let data = cache.get(shard);
  if (!data) { data = loaders[shard]!() as Record<string, string[]>; cache.set(shard, data); }
  return data[character] ?? [];
}
