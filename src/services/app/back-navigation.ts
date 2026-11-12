/** Parent destinations for a screen opened directly without a navigation history. */
export function backFallback(pathname: string): string {
  if (pathname.startsWith('/community/')) return '/community';
  if (pathname === '/stats/words') return '/(tabs)/stats';
  if (pathname === '/path' || pathname === '/hsk/syllabus') return '/(tabs)/hsk';
  if (pathname.startsWith('/path/')) return '/path';
  if (pathname === '/learn/session') return '/learn/setup';
  if (pathname === '/learn/setup') return '/(tabs)';
  if (pathname.startsWith('/word/') || pathname === '/decks') return '/(tabs)/vocabulary';
  if (['/memory', '/speaking', '/mistakes', '/listening', '/exam'].includes(pathname)) return '/practice';
  if (pathname === '/english/deck-trash') return '/english/decks';
  const parent = pathname.slice(0, pathname.lastIndexOf('/'));
  return parent || '/(tabs)';
}
