/** English screens use the shared light/dark background. Chinese legacy rule stays intact. */
export function appStatusBarStyle(language: 'en' | 'zh', mode: 'light' | 'dark', pathname: string): 'light' | 'dark' {
  if (mode === 'dark') return 'light';
  return language === 'zh' && pathname.endsWith('/vocabulary') ? 'light' : 'dark';
}
